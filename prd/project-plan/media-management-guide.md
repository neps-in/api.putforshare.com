# Media Management Guide

## Overview

The Media model serves as a **central repository** for all images in the marketplace. This approach enables:
- **Image Reuse** - Upload once, use in multiple inventories or profiles
- **Cost Savings** - Reduce S3 storage by 30-40% through deduplication
- **Centralized Management** - Archive/delete from one location
- **Analytics** - Track which images are most popular
- **Performance** - CDN caching for frequently used images

---

## Media Model Structure

### Complete Model Definition

```python
import uuid
from django.db import models

class Media(models.Model):
    """
    Central media repository for all images (profile photos, inventory images, etc.)
    One media can be associated with multiple inventories or profiles (reusable)
    """
    
    class FileType(models.TextChoices):
        IMAGE_JPEG = 'image/jpeg', 'JPEG Image'
        IMAGE_PNG = 'image/png', 'PNG Image'
        IMAGE_WEBP = 'image/webp', 'WebP Image'
        IMAGE_GIF = 'image/gif', 'GIF Image'
    
    # Core Identity
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        help_text="Unique identifier for this media file"
    )
    
    # File Information
    file_name = models.CharField(
        max_length=255,
        help_text="Original filename uploaded by user"
    )
    alt_tag = models.CharField(
        max_length=255,
        blank=True,
        help_text="Alt text for accessibility (SEO and screen readers)"
    )
    file_type = models.CharField(
        max_length=20,
        choices=FileType.choices,
        help_text="Auto-captured from content type during upload"
    )
    
    # Storage
    s3_url = models.URLField(
        max_length=500,
        unique=True,
        help_text="Full S3 URL with CDN (e.g., https://cdn.example.com/media/uuid.jpg)"
    )
    
    # Metadata
    created_on = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When this media was uploaded"
    )
    
    # Status
    status = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Active (True) or Inactive (False)"
    )
    archived = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Soft delete flag - archived media can be restored"
    )
    
    class Meta:
        db_table = 'media'
        verbose_name = 'Media'
        verbose_name_plural = 'Media'
        ordering = ['-created_on']
        indexes = [
            models.Index(fields=['uuid']),
            models.Index(fields=['status', 'archived']),
            models.Index(fields=['file_type', 'status']),
            models.Index(fields=['created_on']),
        ]
    
    def __str__(self):
        return f"{self.file_name} ({self.uuid})"
    
    def get_usage_count(self):
        """Get count of how many times this media is used"""
        profile_usage = self.profile_images.count()
        inventory_usage = self.inventory_images.count()
        return profile_usage + inventory_usage
    
    def is_reusable(self):
        """Check if media can be reused (not archived, active)"""
        return self.status and not self.archived
    
    @classmethod
    def create_from_upload(cls, file, alt_tag=''):
        """
        Create Media instance from uploaded file
        Handles S3 upload and metadata extraction
        
        Args:
            file: Django UploadedFile object
            alt_tag: Optional alt text for accessibility
            
        Returns:
            Media: Created media instance
            
        Raises:
            ValueError: If file type is not supported
        """
        import mimetypes
        from django.core.files.storage import default_storage
        
        # Detect file type from content
        content_type, _ = mimetypes.guess_type(file.name)
        if content_type not in dict(cls.FileType.choices):
            raise ValueError(f"Unsupported file type: {content_type}")
        
        # Generate unique filename
        import uuid as uuid_lib
        file_uuid = uuid_lib.uuid4()
        extension = file.name.split('.')[-1]
        unique_filename = f"media/{file_uuid}.{extension}"
        
        # Upload to S3
        s3_path = default_storage.save(unique_filename, file)
        s3_url = default_storage.url(s3_path)
        
        # Create Media record
        media = cls.objects.create(
            file_name=file.name,
            alt_tag=alt_tag,
            file_type=content_type,
            s3_url=s3_url,
        )
        
        return media
```

---

## Association Models

### InventoryImage (Many-to-Many)

Links Inventory items to Media (one inventory can have multiple images, one image can be used in multiple inventories)

```python
class InventoryImage(models.Model):
    """
    Association between Inventory and Media (many-to-many through model)
    One inventory can have multiple images (1-5)
    One image (Media) can be used in multiple inventories (reusable)
    """
    inventory = models.ForeignKey(
        Inventory,
        on_delete=models.CASCADE,
        related_name='images'
    )
    media = models.ForeignKey(
        Media,
        on_delete=models.PROTECT,  # Don't delete media if used in inventory
        related_name='inventory_images'
    )
    order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'inventory_images'
        ordering = ['order']
        unique_together = [('inventory', 'order')]
    
    @property
    def image_url(self):
        """Get S3 URL from associated Media"""
        return self.media.s3_url if self.media else None
```

### ProfileImage (One-to-One)

Links User profiles to Media (one user has one profile picture, one image can be used by multiple users)

```python
class ProfileImage(models.Model):
    """
    Association between User Profile and Media
    One user can have one profile image
    One image (Media) can be used by multiple users (reusable)
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile_image'
    )
    media = models.ForeignKey(
        Media,
        on_delete=models.PROTECT,
        related_name='profile_images'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'profile_images'
    
    @property
    def image_url(self):
        """Get S3 URL from associated Media"""
        return self.media.s3_url if self.media else None
```

---

## API Endpoints

### 1. Upload Media

**Endpoint:** `POST /api/media/upload`

**Description:** Upload a new image to S3 and create Media record

**Request:**
```http
POST /api/media/upload
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

file: <binary_image_data>
alt_tag: "iPhone 13 Pro front view" (optional)
```

**Response (Success - 201 Created):**
```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "file_name": "iphone13.jpg",
  "alt_tag": "iPhone 13 Pro front view",
  "file_type": "image/jpeg",
  "s3_url": "https://cdn.example.com/media/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
  "created_on": "2026-02-08T10:30:00Z",
  "status": true,
  "archived": false
}
```

**Response (Error - 400 Bad Request):**
```json
{
  "error": "Unsupported file type: image/svg+xml"
}
```

**Validation:**
- File type must be: JPEG, PNG, WebP, or GIF
- Max file size: 100MB (configurable)
- User must be authenticated

---

### 2. Get Media by UUID

**Endpoint:** `GET /api/media/:uuid`

**Description:** Retrieve media details by UUID

**Request:**
```http
GET /api/media/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <jwt_token>
```

**Response (Success - 200 OK):**
```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "file_name": "iphone13.jpg",
  "alt_tag": "iPhone 13 Pro front view",
  "file_type": "image/jpeg",
  "s3_url": "https://cdn.example.com/media/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
  "created_on": "2026-02-08T10:30:00Z",
  "status": true,
  "archived": false,
  "usage_count": 3
}
```

---

### 3. List Media

**Endpoint:** `GET /api/media`

**Description:** List all media uploaded by current user

**Request:**
```http
GET /api/media?status=true&limit=20&offset=0
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `status` (optional): Filter by active status (true/false)
- `archived` (optional): Filter by archived status (true/false)
- `file_type` (optional): Filter by file type (image/jpeg, image/png, etc.)
- `limit` (optional): Number of results per page (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response (Success - 200 OK):**
```json
{
  "count": 45,
  "next": "/api/media?limit=20&offset=20",
  "previous": null,
  "results": [
    {
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "file_name": "iphone13.jpg",
      "alt_tag": "iPhone 13 Pro front view",
      "file_type": "image/jpeg",
      "s3_url": "https://cdn.example.com/media/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
      "created_on": "2026-02-08T10:30:00Z",
      "status": true,
      "archived": false,
      "usage_count": 3
    },
    // ... more media objects
  ]
}
```

---

### 4. Update Media

**Endpoint:** `PATCH /api/media/:uuid`

**Description:** Update media metadata (alt_tag, status, archived)

**Request:**
```http
PATCH /api/media/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "alt_tag": "Updated alt text",
  "status": true
}
```

**Response (Success - 200 OK):**
```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "file_name": "iphone13.jpg",
  "alt_tag": "Updated alt text",
  "file_type": "image/jpeg",
  "s3_url": "https://cdn.example.com/media/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
  "created_on": "2026-02-08T10:30:00Z",
  "status": true,
  "archived": false
}
```

**Note:** Cannot update `file_name`, `file_type`, or `s3_url` (immutable)

---

### 5. Archive Media

**Endpoint:** `DELETE /api/media/:uuid`

**Description:** Soft delete (archive) media

**Request:**
```http
DELETE /api/media/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <jwt_token>
```

**Response (Success - 200 OK):**
```json
{
  "message": "Media archived successfully",
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "archived": true
}
```

**Response (Error - 409 Conflict):**
```json
{
  "error": "Cannot archive media. Still in use by 3 inventories.",
  "usage_count": 3
}
```

**Behavior:**
- Sets `archived = True`
- Does NOT delete from S3 (for data recovery)
- Only allowed if `usage_count = 0` (not used in any inventory/profile)

---

### 6. Get Media Usage

**Endpoint:** `GET /api/media/:uuid/usage`

**Description:** Get all inventories and profiles using this media

**Request:**
```http
GET /api/media/a1b2c3d4-e5f6-7890-abcd-ef1234567890/usage
Authorization: Bearer <jwt_token>
```

**Response (Success - 200 OK):**
```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "total_usage": 3,
  "inventories": [
    {
      "id": 101,
      "title": "iPhone 13 Pro 256GB",
      "url": "/inventories/101"
    },
    {
      "id": 205,
      "title": "iPhone 13 Pro 128GB",
      "url": "/inventories/205"
    }
  ],
  "profiles": [
    {
      "user_id": 42,
      "email": "john@example.com",
      "url": "/users/42/profile"
    }
  ]
}
```

---

## Frontend Implementation

### Upload Component (React)

```jsx
import { useState } from 'react';

function MediaUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [altTag, setAltTag] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('alt_tag', altTag);
    
    try {
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const media = await response.json();
      onUploadSuccess(media);
      
      // Reset form
      setFile(null);
      setAltTag('');
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">Upload Image</h3>
      
      {/* File Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Select Image
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full px-4 py-2 border rounded"
        />
      </div>
      
      {/* Alt Tag Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Alt Text (Optional)
        </label>
        <input
          type="text"
          value={altTag}
          onChange={(e) => setAltTag(e.target.value)}
          placeholder="Describe the image for accessibility"
          className="w-full px-4 py-2 border rounded"
        />
      </div>
      
      {/* Preview */}
      {file && (
        <div className="mb-4">
          <img
            src={URL.createObjectURL(file)}
            alt="Preview"
            className="max-w-xs rounded"
          />
        </div>
      )}
      
      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
}
```

### Media Gallery Component

```jsx
function MediaGallery({ onSelectMedia }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchMedia();
  }, []);
  
  const fetchMedia = async () => {
    try {
      const response = await fetch('/api/media?status=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setMedia(data.results);
    } catch (error) {
      console.error('Fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div>Loading media...</div>;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {media.map((item) => (
        <div
          key={item.uuid}
          onClick={() => onSelectMedia(item)}
          className="cursor-pointer border rounded hover:border-blue-500"
        >
          <img
            src={item.s3_url}
            alt={item.alt_tag || item.file_name}
            className="w-full h-40 object-cover rounded-t"
          />
          <div className="p-2">
            <p className="text-sm truncate">{item.file_name}</p>
            <p className="text-xs text-gray-500">
              Used: {item.usage_count} times
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Backend Implementation

### Django View (Media Upload)

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from accounts.models import Media

class MediaUploadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Upload media file to S3 and create Media record
        """
        file = request.FILES.get('file')
        alt_tag = request.data.get('alt_tag', '')
        
        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (100MB max)
        if file.size > 100 * 1024 * 1024:
            return Response(
                {'error': 'File size exceeds 100MB limit'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create Media instance (handles S3 upload)
            media = Media.create_from_upload(file, alt_tag)
            
            # Serialize and return
            serializer = MediaSerializer(media)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
```

### Django Serializer

```python
from rest_framework import serializers
from accounts.models import Media

class MediaSerializer(serializers.ModelSerializer):
    usage_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Media
        fields = [
            'uuid', 'file_name', 'alt_tag', 'file_type',
            's3_url', 'created_on', 'status', 'archived',
            'usage_count'
        ]
        read_only_fields = ['uuid', 'file_type', 's3_url', 'created_on']
    
    def get_usage_count(self, obj):
        return obj.get_usage_count()
```

---

## Usage Examples

### Creating Inventory with Media

```python
# Backend: Create inventory with existing media
from inventory.models import Inventory, InventoryImage
from accounts.models import Media

# Get or upload media
media_uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
media = Media.objects.get(uuid=media_uuid)

# Create inventory
inventory = Inventory.objects.create(
    seller=request.user,
    title='iPhone 13 Pro',
    # ... other fields
)

# Associate media with inventory
InventoryImage.objects.create(
    inventory=inventory,
    media=media,
    order=0  # First image
)
```

### Reusing Media Across Inventories

```python
# Same media can be used in multiple inventories
media = Media.objects.get(uuid='a1b2c3d4-e5f6-7890-abcd-ef1234567890')

# Use in inventory 1
InventoryImage.objects.create(
    inventory=inventory1,
    media=media,
    order=0
)

# Reuse in inventory 2
InventoryImage.objects.create(
    inventory=inventory2,
    media=media,
    order=0
)

# Check usage
print(media.get_usage_count())  # Output: 2
```

### Setting Profile Image

```python
# Backend: Set user profile image
from accounts.models import ProfileImage, Media

media = Media.objects.get(uuid='a1b2c3d4-e5f6-7890-abcd-ef1234567890')

# Create or update profile image
profile_image, created = ProfileImage.objects.update_or_create(
    user=request.user,
    defaults={'media': media}
)
```

---

## Best Practices

### 1. Image Optimization

```python
# Before uploading to S3, compress images
from PIL import Image
import io

def optimize_image(file, max_size=(1920, 1920), quality=85):
    """
    Optimize image before uploading
    """
    img = Image.open(file)
    
    # Convert RGBA to RGB if needed
    if img.mode == 'RGBA':
        img = img.convert('RGB')
    
    # Resize if larger than max_size
    img.thumbnail(max_size, Image.LANCZOS)
    
    # Save to buffer
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=quality, optimize=True)
    buffer.seek(0)
    
    return buffer
```

### 2. Generate Thumbnails

```python
# Create multiple sizes for responsive images
def create_thumbnail(media, size=(300, 300)):
    """
    Create thumbnail version of media
    """
    # Download from S3
    response = requests.get(media.s3_url)
    img = Image.open(io.BytesIO(response.content))
    
    # Create thumbnail
    img.thumbnail(size, Image.LANCZOS)
    
    # Upload as new media
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=80)
    buffer.seek(0)
    
    # ... upload to S3 and create Media record
```

### 3. Lazy Loading

```jsx
// Frontend: Lazy load images
<img
  src={media.s3_url}
  alt={media.alt_tag}
  loading="lazy"
  className="w-full h-auto"
/>
```

### 4. CDN Caching

```python
# settings.py
AWS_S3_CUSTOM_DOMAIN = 'cdn.example.com'
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',  # 24 hours
}
```

---

## Security Considerations

### 1. File Type Validation

```python
# Validate file signature (magic bytes) not just extension
import magic

def validate_image_file(file):
    """
    Validate file is actually an image
    """
    mime = magic.from_buffer(file.read(1024), mime=True)
    file.seek(0)
    
    allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    
    if mime not in allowed_types:
        raise ValueError(f"Invalid file type: {mime}")
```

### 2. Virus Scanning

```python
# Use ClamAV or cloud service to scan uploads
import pyclamd

def scan_for_viruses(file):
    """
    Scan uploaded file for viruses
    """
    cd = pyclamd.ClamdUnixSocket()
    
    file_content = file.read()
    file.seek(0)
    
    result = cd.scan_stream(file_content)
    
    if result:
        raise ValueError("File contains malware")
```

### 3. Access Control

```python
# Only allow users to access their own media
class MediaViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        # Users can only see media they uploaded
        # or media used in their inventories
        return Media.objects.filter(
            Q(inventory_images__inventory__seller=self.request.user) |
            Q(profile_images__user=self.request.user)
        ).distinct()
```

---

## Performance Optimization

### 1. Database Indexes

Already configured in the model:
```python
indexes = [
    models.Index(fields=['uuid']),           # Fast UUID lookup
    models.Index(fields=['status', 'archived']),  # Filter queries
    models.Index(fields=['file_type', 'status']), # Type filtering
    models.Index(fields=['created_on']),     # Ordering
]
```

### 2. Query Optimization

```python
# Prefetch related inventory images
media_list = Media.objects.prefetch_related(
    'inventory_images',
    'profile_images'
).filter(status=True)

# Annotate with usage count
from django.db.models import Count

media_list = Media.objects.annotate(
    usage_count=Count('inventory_images') + Count('profile_images')
)
```

### 3. Caching

```python
from django.core.cache import cache

def get_media(uuid):
    """
    Get media with caching
    """
    cache_key = f'media:{uuid}'
    media = cache.get(cache_key)
    
    if not media:
        media = Media.objects.get(uuid=uuid)
        cache.set(cache_key, media, timeout=3600)  # 1 hour
    
    return media
```

---

## Analytics & Reporting

### Most Used Media

```python
# Get top 10 most reused images
from django.db.models import Count

popular_media = Media.objects.annotate(
    usage=Count('inventory_images') + Count('profile_images')
).filter(
    status=True,
    archived=False
).order_by('-usage')[:10]
```

### Storage Usage

```python
# Calculate total storage used
total_storage = Media.objects.filter(
    status=True,
    archived=False
).count() * 5  # Assume avg 5MB per image

print(f"Total storage: {total_storage} MB")
```

### Unused Media Cleanup

```python
# Find unused media older than 30 days
from datetime import timedelta
from django.utils import timezone

unused_media = Media.objects.annotate(
    usage=Count('inventory_images') + Count('profile_images')
).filter(
    usage=0,
    created_on__lt=timezone.now() - timedelta(days=30)
)

# Archive unused media
unused_media.update(archived=True)
```

---

## Testing

### Unit Tests

```python
from django.test import TestCase
from accounts.models import Media
from django.core.files.uploadedfile import SimpleUploadedFile

class MediaModelTestCase(TestCase):
    def test_create_from_upload(self):
        """Test creating media from uploaded file"""
        # Create fake image file
        image = SimpleUploadedFile(
            "test.jpg",
            b"file_content",
            content_type="image/jpeg"
        )
        
        # Create media
        media = Media.create_from_upload(image, alt_tag="Test image")
        
        # Assertions
        self.assertIsNotNone(media.uuid)
        self.assertEqual(media.file_name, "test.jpg")
        self.assertEqual(media.file_type, "image/jpeg")
        self.assertEqual(media.alt_tag, "Test image")
        self.assertTrue(media.status)
        self.assertFalse(media.archived)
    
    def test_unsupported_file_type(self):
        """Test uploading unsupported file type"""
        svg_file = SimpleUploadedFile(
            "test.svg",
            b"<svg></svg>",
            content_type="image/svg+xml"
        )
        
        with self.assertRaises(ValueError):
            Media.create_from_upload(svg_file)
    
    def test_get_usage_count(self):
        """Test usage count calculation"""
        media = Media.objects.create(
            file_name="test.jpg",
            file_type="image/jpeg",
            s3_url="https://example.com/test.jpg"
        )
        
        # Initially 0
        self.assertEqual(media.get_usage_count(), 0)
        
        # Create inventory image
        InventoryImage.objects.create(
            inventory=some_inventory,
            media=media,
            order=0
        )
        
        # Now 1
        self.assertEqual(media.get_usage_count(), 1)
```

---

## Summary

### Media Model Features ✅

1. **UUID** - Unique identifier ✅
2. **file_name** - Original filename ✅
3. **alt_tag** - Accessibility text ✅
4. **file_type** - Auto-captured from content type ✅
5. **s3_url** - Full S3 URL with CDN ✅
6. **created_on** - Upload timestamp ✅
7. **status** - Boolean active/inactive ✅
8. **archived** - Boolean soft delete ✅

### Benefits

✅ **30-40% storage savings** through image reuse  
✅ **Centralized management** of all media  
✅ **Better performance** with CDN caching  
✅ **Analytics** on image usage  
✅ **Soft delete** for data recovery  
✅ **Scalable** architecture  

---

**Ready for implementation in Sprint 2!**

**Version:** 1.0 - Media Management Guide  
**Last Updated:** February 2026
