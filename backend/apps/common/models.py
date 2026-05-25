from django.db import models
from apps.common.uuid_utils import generate_uuid7


class UUIDModel(models.Model):
    uuid = models.UUIDField(default=generate_uuid7, unique=True, db_index=True, editable=False)
    is_active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    def delete(self, using=None, keep_parents=False, hard=False):
        if hard:
            return super().delete(using=using, keep_parents=keep_parents)
        self.is_archived = True
        self.save(update_fields=["is_archived", "updated_on"])
        return 1, {self.__class__.__name__: 1}

    class Meta:
        abstract = True
