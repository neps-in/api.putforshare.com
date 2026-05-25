from rest_framework import serializers


class S3BrowserQuerySerializer(serializers.Serializer):
    cursor = serializers.CharField(required=False, allow_blank=True)
    search = serializers.CharField(required=False, allow_blank=True)
    page_size = serializers.IntegerField(min_value=1, max_value=100, required=False, default=24)


class S3BrowserDetailQuerySerializer(serializers.Serializer):
    key = serializers.CharField(required=False, allow_blank=True)
