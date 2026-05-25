import boto3
from django.conf import settings
from botocore.exceptions import ClientError


def delete_s3_object(file_key):
    """
    Delete an object from AWS S3.

    :param file_key: The S3 object key (file path in S3)
    ✅ file_key is the path of the file in S3 (e.g., "folder/image.jpg").
    :return: True if deleted successfully, False otherwise
    """
    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )

    try:
        s3.delete_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=file_key)
        print(f"Deleted: {file_key} from {settings.AWS_STORAGE_BUCKET_NAME}")
        return True
    except ClientError as e:
        print(f"Error deleting {file_key}: {e}")
        return False
