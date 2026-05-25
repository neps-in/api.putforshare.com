import os
import re
import json
import functools
import requests
import numpy as np
import boto3


from django.http import JsonResponse
from django.conf import settings
from django.db import models
from django.db.models import ProtectedError

from rest_framework.views import exception_handler
from rest_framework.renderers import JSONRenderer
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination

from drf_standardized_errors.formatter import ExceptionFormatter
from drf_standardized_errors.types import ErrorResponse


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


# class PfsCustomPagination(PageNumberPagination):
#     page_size = 20
#     page_size_query_param = 'page_size'
#     max_page_size = 100


def download_image(url, save_path):
    """
    Download an image from the given URL and save it to the specified path.
    """
    try:
        # Send a GET request to fetch the image
        response = requests.get(url)

        # Check if the request was successful
        if response.status_code == 200:
            with open(save_path, 'wb') as file:
                # Write the image content to the file
                file.write(response.content)
            print(f"Image saved to {save_path}")
        else:
            print(
                f"Failed to retrieve image from {url}, Status Code: {response.status_code}")
    except Exception as e:
        print(f"Error downloading {url}: {e}")


def download_images_from_urls(urls, num_images=3, download_dir="downloaded_images"):
    """
    Download 'n' images (small, medium, large) from given URLs.

    :param urls: List of URLs in the format: {"small": url1, "medium": url2, "large": url3}
    :param num_images: Number of images to download
    :param download_dir: Directory where images will be saved
    """
    # Create a directory to save the images
    if not os.path.exists(download_dir):
        os.makedirs(download_dir)

    # Iterate over the URLs dictionary and download images
    for i, (size, url) in enumerate(urls.items()):
        if i >= num_images:
            break  # Download only 'num_images' images

        # Construct the save path for the image (use the size as part of the filename)
        save_path = os.path.join(download_dir, f"{size}_image_{i + 1}.jpg")

        # Download the image
        download_image(url, save_path)


def clean_isbn(input_string):
    # Remove '-', '_', and spaces from given string and return the cleaned string
    result = input_string.replace("-", "").replace("_", "").replace(" ", "")
    return result


def print_database_profiles():
    # Print header
    print("List of Database Profiles:")
    # print(f"Database Name: {DATABASES['default']['NAME']}")
    print(settings.DATABASES, sep="\n")
    active_db = settings.DATABASES['default']

    # Print all database profiles
    for db_name, db_config in settings.DATABASES.items():
        # Check if this is the active profile
        if db_config == active_db:
            print(f"**Active Profile: {db_name}**")
        else:
            print(f"Profile: {db_name}")

        print(f"  ENGINE: {db_config['ENGINE']}")
        print(f"  NAME: {db_config['NAME']}")
        print(f"  USER: {db_config['USER']}")
        print(f"  HOST: {db_config['HOST']}")
        print(f"  PORT: {db_config['PORT']}")
        print('-' * 40)


def choices_to_selectbox_dict(choices):
    """
    Converts choices to JSON dict as expected by react admin
    :param choices:
    input format as given in Choices in Django model
    [
        [
            "DRAFT",
            "Pickup Request saved as DRAFT"
        ],
        [
            "BOOKED",
            "Pickup Request is Booked by the customer"
        ],
    ]

    :return:
    # The following is the format used in react-admin
    [
        {
            "value": "DRAFT",
            "label": "Pickup Request saved as DRAFT"
        },
        {
            "value": "BOOKED",
            "label": "Pickup Request is Booked by the customer"
        },
    ]

    """
    result = []
    for item in choices:
        item_dict = {}
        item_dict['value'] = item[0]
        item_dict['label'] = item[1]
        result.append(item_dict)

    return result


def custom_exception_handler(exc):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc)

    # Now add the HTTP status code to the response.
    if response is not None:
        response.data['status_code'] = response.status_code

    return response


def pfs_slugify(string):
    """
    Convert a string to a slug.

    Args:
      string: The string to convert.

    Returns:
      A slug.
    """

    # Remove non-alphanumeric characters.
    string = re.sub(r"[^\w\s-]", "", string)

    # Convert spaces to hyphens.
    string = re.sub(r"\s+", "-", string)

    # Convert underscores to hyphens.
    string = re.sub(r"_", "-", string)

    # Lowercase the string.
    string = string.lower()

    # Return the slug.
    return string


def logme_method(f):
    """
    Use this decorator to get function name or method name in a class
    @logme_method - add this on top of the method that you want to display
    when it gets called.
    """
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        class_name = args[0].__class__.__name__ if args else "NotAClass"
        print(f"*** Calling: {class_name}.{f.__name__}")
        return f(*args, **kwargs)
    return wrapped


def logme(f):
    """
    Use this decorator to get function name when called
    @logme - add this on top of the function to display
    """
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        print(f"********* Calling: {f.__name__}")
        return f(*args, **kwargs)
    return wrapped


def search_by_isbn_openlibrary(request, isbn):
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
    response = requests.get(url)

    if response.status_code == 200:
        book_data = response.json()
        print(book_data)
        if book_data:
            book_info = book_data.get(f"ISBN:{isbn}", {})
            isbn_10 = book_info.get("identifiers", {}).get(
                "isbn_10", ['N/AAA'])
            isbn_10 = isbn_10[0]

            isbn_13 = book_info.get("identifiers", {}).get(
                "isbn_13", ['N/AAA'])
            isbn_13 = isbn_13[0]

            result = {
                "title": f"{book_info.get('title', 'N/A')} {book_info.get('subtitle', '')}".strip(),
                "authors": [author.get('name') for author in book_info.get("authors", [])],
                # "isbn_10": book_info.get("isbm_10", "N/A"),
                "isbn_10": isbn_10,
                "isbn_13": isbn_13,
                # "isbn_13": book_info.get("isbm_13", "N/A"),
                "page_count": book_info.get("number_of_pages", "100"),
                "publishers": [publisher.get('name') for publisher in book_info.get("publishers", [])],
                "published_year": book_info.get("publish_date", "N/A"),
                "cover_large": book_info.get("cover", {}).get("large", ""),
                "cover_medium": book_info.get("cover", {}).get("medium", ""),
                "cover_small": book_info.get("cover", {}).get("small", ""),
                "description": book_info.get("description", "N/A"),
                "subjects": [subject.get('name') for subject in book_info.get("subjects", [])],
                "reviews_count": book_info.get("reviews_count", "0"),

            }

            return JsonResponse(result, json_dumps_params={'indent': 4})
        else:
            return JsonResponse({"Error": f"No book found for ISBN: {isbn}"}, status=404)
    else:
        return JsonResponse({"Error": f"Errorr occurred: {response.status_code}"}, status=response.status_code)




# cleaned code v2
def search_google_books_by_isbn(isbn):
    """_summary_
    # Example usage
    # search_google_books_by_isbn("0596003307")

    Args:
        isbn (bool): _description_

    Returns:
        _type_: _description_
    """
    base_url = "https://www.googleapis.com/books/v1/volumes"
    url = f"{base_url}?q=isbn:{isbn}"
    print('search_google_books_by_isbn v2', url)
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()  # raises error for 4xx/5xx
        
        # Parse success response
        data = response.json()
        print(data)
        
        # Check if we have results
        if not data.get("items"):
            return JsonResponse(
                {"error": f"No book found for ISBN: {isbn}"}, 
                status=404
            )

        if "items" in data:
            first_item = data['items'][0]
            book = first_item.get('volumeInfo', {})

            sale_info = data['items'][0].get('saleInfo', {})
            
            for identifier in book.get('industryIdentifiers', []):
                if identifier.get('type') == 'ISBN_10':
                    isbn_10 = identifier.get('identifier', 'NA')
                elif identifier.get('type') == 'ISBN_13':
                    isbn_13 = identifier.get('identifier', 'NA')

            result = {
                "title": book.get('title', 'NA'),
                "authors": ', '.join(book.get('authors', ['NA'])),
                "description": book.get('description', 'NA'),
                "publisher": book.get('publisher', 'NA'),
                "published_year": book.get('publishedDate', 'NA'),
                "page_count": book.get('pageCount', 'NA'),
                "isbn_10": isbn_10,
                "isbn_13": isbn_13,
                "language": book.get('language', 'NA'),
                "subjects": ', '.join(book.get('categories', [])) or 'NA',
                "cover_image": book.get('imageLinks', {}).get('thumbnail', 'NA'),
                # "price": sale_info.get('listPrice', {}).get('amount', '0'),
            }

            return JsonResponse(result, json_dumps_params={'indent': 4})

        
    except requests.exceptions.HTTPError as e:
        return JsonResponse(
            {"error": f"HTTP error {e.response.status_code}: {e.response.reason}"},
            status=e.response.status_code
        )
    except requests.exceptions.RequestException as e:
        return JsonResponse(
            {"error": f"Request failed: {str(e)}"},
            status=500
        )
    except Exception as e:
        # Catch-all for any other errors (JSON parsing, KeyError, etc.)
        return JsonResponse(
            {"error": f"Unexpected error: {str(e)}"},
            status=500
        )


def search_by_isbn_isbndb(isbn):
    hdr = {'Authorization': settings.ISBND_API_KEY}
    url = f"https://api2.isbndb.com/book/{isbn}"
    response = requests.get(url, headers=hdr)

    if response.status_code == 200:
        book_data = response.json()
        print(json.dumps(book_data, indent=4))

        if book_data:
            book_info = book_data["book"]

            # Calculating volume in cubic centimeters (cm��)
            dimensions = book_info.get("dimensions_structured", {})

            height = dimensions.get("height", {}).get(
                "value", 0) * 2.54  # inches to cm
            width = dimensions.get("width", {}).get(
                "value", 0) * 2.54  # inches to cm
            length = dimensions.get("length", {}).get(
                "value", 0) * 2.54  # inches to cm
            weight = dimensions.get("weight", {}).get(
                "value", 0) * 453.592  # pounds to grams

            # Formatting results
            height = round(height, 2)
            width = round(width, 2)
            length = round(length, 2)
            weight = round(weight, 2)

            result = {
                "title": book_info.get("title", "N/A"),
                "authors": book_info.get("authors", []),
                "isbn_10": book_info.get("isbn10", "N/A"),
                "isbn_13": book_info.get("isbn13", "N/A"),
                "page_count": book_info.get("pages", "N/A"),
                "publishers": [book_info.get("publisher")] if book_info.get("publisher") else [],
                "published_year": book_info.get("date_published", "N/A"),
                "cover_image": book_info.get("image", ""),
                "short_description": book_info.get("synopsis", "N/A"),
                "description": book_info.get("synopsis", "N/A"),
                "subjects": book_info.get("subjects", []),
                "covertype": book_info.get("binding", "N/A"),
                "book_edition": book_info.get("edition", "N/A"),
                "product_dimension_length": length,
                "product_dimension_breadth": width,
                "product_dimension_height": height,
                "product_dimension_weight": weight,
            }

            return JsonResponse(result, json_dumps_params={'indent': 4})
        else:
            return JsonResponse({"Error": f"No book found for ISBN: {isbn}"}, status=404)
    else:
        return JsonResponse({"Error": f"Errorr occurred: {response.status_code}"}, status=response.status_code)

def search_by_upcdb(request, isbn):
    # hdr = {'Authorization': settings.ISBND_API_KEY}
    
    url = f"https://api.upcitemdb.com/prod/trial/lookup?upc={isbn}"

    response = requests.get(url)

    if response.status_code == 200:
        book_data = response.json()
        print(json.dumps(book_data, indent=4))


# Sample prices from different sellers
prices = [10.99, 11.49, 12.99, 10.99, 15.99, 9.99, 500.00]  # Example prices


def find_anomalous_prices(prices, threshold=1.5):
    mean_price = np.mean(prices)
    std_dev_price = np.std(prices)

    anomalous_prices = []
    for price in prices:
        if abs(price - mean_price) > threshold * std_dev_price:
            anomalous_prices.append(price)

    return anomalous_prices


# anomalies = find_anomalous_prices(prices)
# print("Anomalous Prices:", anomalies)



# Example usage:
# send_email('meetneps@gmail.com', 'Subject of the email',
#          '<strong>This is the content of the email</strong>')


def check_constraints_and_delete(instance):
    related_objects = [
        f for f in instance._meta.get_fields()
        if (f.one_to_many or f.one_to_one) and f.auto_created
    ]

    related_info = []

    for related_object in related_objects:
        related_manager = getattr(instance, related_object.get_accessor_name())
        if related_manager.exists():
            related_info.append({
                "related_model": related_object.related_model.__name__,
                "field_name": related_object.name,
                "related_objects": [str(obj) for obj in related_manager.all()]
            })

    if related_info:
        raise ValidationError({
            "error": f"Cannot delete {instance} because it has related objects.",
            "details": related_info
        })


# Example Usage
# Assuming `User` model has foreign key relations like `Cart` or `Order`
# user = User.objects.get(id=1)
# check_constraints_and_delete(user)


# def search_google_books_by_isbn(isbn):
#     # Base URL for Google Books API
#     base_url = "https://www.googleapis.com/books/v1/volumes"

#     # Make the API request with ISBN
#     response = requests.get(f"{base_url}?q=isbn:{isbn}")

#     if response.status_code == 200:
#         data = response.json()

#         # Check if any books are found
#         if "items" in data:
#             book = data['items'][0]['volumeInfo']

#             # Display relevant book details
#             title = book.get('title', 'No title available')
#             authors = ', '.join(book.get('authors', ['Unknown author']))
#             description = book.get('description', 'No description available')
#             price = book.get('saleInfo', {}).get(
#                 'listPrice', {}).get('amount', 'No price available')

#             print(f"Title: {title}")
#             print(f"Authors: {authors}")
#             print(f"Description: {description}")
#             print(f"Price: {price}")
#         else:
#             print("No books found.")
#     else:
#         print("Failed to retrieve data from Google Books API.")


# Example usage
# search_google_books_by_isbn("0596003307")


class MyExceptionFormatter(ExceptionFormatter):
    def format_error_response(self, error_response: ErrorResponse):
        error = error_response.errors[0]
        return {
            "type": error_response.type,
            "code": error.code,
            "message": error.detail,
            "field_name": error.attr
        }


class PfsDrfExceptionFormatter(ExceptionFormatter):
    """
    Used by drf_standardized_errors to format the error response.

    Args:
        ExceptionFormatter (_type_): _description_

    Example:
    Case 1 — Not handled by the DRF Standardized Errors Library:

        ...
        if len(attribute) < 10:
        return Response(status=status.HTTP_400_BAD_REQUEST)
        ...

    Case 2 — Recommended approach:

        ...
        if len(attribute) < 10:
        raise ValidationError(
            'Length of the attribute can not be less than 10')
        ...

    """

    def format_error_response(self, error_response: ErrorResponse):
        error = error_response.errors[0]
        if error_response.type == "validation_error" and error.attr != "non_field_errors" and error.attr is not None:
            error_message = f"{error.attr}: {error.detail}"
        else:
            error_message = error.detail
        return {
            "success": False,
            "type": error_response.type,
            "code": error.code,
            "error": error_message
        }


class SuccessJsonResponse(JSONRenderer):
    """
    Used when using drf_standardized_errors, 
    this will return a success response.

    Args:
        JSONRenderer (_type_): _description_
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if not renderer_context['response'].exception:
            data = {
                "success": True,
                "data": data
            }
        return super(SuccessJsonResponse, self).render(data, accepted_media_type, renderer_context)
