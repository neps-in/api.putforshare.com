from rest_framework import serializers


class LanguageSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    name = serializers.CharField()
    code = serializers.CharField(min_length=2, max_length=3)
