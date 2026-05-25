from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LanguageSerializer
from .services import LookupDataError, load_languages


class LanguageListAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            languages = load_languages()
        except LookupDataError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = LanguageSerializer(data=languages, many=True)
        if not serializer.is_valid():
            return Response(
                {
                    "detail": "Languages data is invalid.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(serializer.validated_data, status=status.HTTP_200_OK)
