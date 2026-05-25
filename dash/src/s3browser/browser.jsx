import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import {
  List,
  Pagination,
  SearchInput,
  Show,
  ShowButton,
  SimpleShowLayout,
  TextField as RaTextField,
  TopToolbar,
  useListContext,
  useRecordContext,
  useRefresh,
} from "react-admin";

const formatBytes = (value) => {
  const size = Number(value || 0);
  if (!size) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const formatted = size / 1024 ** exponent;
  return `${formatted.toFixed(formatted >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
  "heic",
  "heif",
  "avif",
]);

const isImageRecord = (record) => {
  const contentType = String(record?.content_type || "").toLowerCase();
  if (contentType.startsWith("image/")) {
    return true;
  }

  const key = String(record?.full_path || record?.name || "").toLowerCase();
  const ext = key.includes(".") ? key.split(".").pop() : "";
  return IMAGE_EXTENSIONS.has(ext);
};

const IMAGE_VARIANT_PATTERNS = [
  {
    label: "thumbnail",
    regex: /(?:^|[._-])(thumb|thumbnail)$/i,
    weight: 100,
  },
  {
    label: "small",
    regex: /(?:^|[._-])(small|sm)$/i,
    weight: 200,
  },
  {
    label: "medium",
    regex: /(?:^|[._-])(medium|med|md)$/i,
    weight: 300,
  },
  {
    label: "large",
    regex: /(?:^|[._-])(large|lg)$/i,
    weight: 400,
  },
  {
    label: "original",
    regex: /(?:^|[._-])(original|orig)$/i,
    weight: 500,
  },
  {
    label: null,
    regex: /@(\d+(?:\.\d+)?)x$/i,
    getLabel: (match) => `${match[1]}x`,
    getWeight: (match) => 450 + Number(match[1]) * 10,
  },
  {
    label: null,
    regex: /(?:^|[._-])(\d{2,5})x(\d{2,5})$/i,
    getLabel: (match) => `${match[1]}x${match[2]}`,
    getWeight: (match) => 150 + (Number(match[1]) * Number(match[2])) / 1000,
    getDimensions: (match) => ({
      width: Number(match[1]),
      height: Number(match[2]),
    }),
  },
];

const humanizeStem = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseImageVariantInfo = (record) => {
  const fullPath = String(record?.full_path || record?.name || "").trim();
  const fileName = fullPath.split("/").pop() || fullPath;
  const directory = fullPath.includes("/") ? fullPath.slice(0, fullPath.lastIndexOf("/")) : "";
  const dotIndex = fileName.lastIndexOf(".");
  const stem = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "";
  const imageRecord = isImageRecord(record);

  if (!imageRecord) {
    return {
      fullPath,
      fileName,
      directory,
      stem,
      extension,
      familyStem: stem,
      familyKey: "",
      candidateFamilyKey: `${directory}/${stem}`,
      variantLabel: "",
      variantWeight: 0,
      variantMatched: false,
      displayName: humanizeStem(stem) || fileName,
    };
  }

  let familyStem = stem;
  let variantLabel = "";
  let variantWeight = 0;
  let variantMatched = false;
  let imageWidth = null;
  let imageHeight = null;

  for (const pattern of IMAGE_VARIANT_PATTERNS) {
    const match = stem.match(pattern.regex);
    if (!match) continue;

    const baseStem = stem.slice(0, match.index).replace(/[._-]+$/, "").trim();
    if (!baseStem) continue;

    familyStem = baseStem;
    variantLabel = pattern.getLabel ? pattern.getLabel(match) : pattern.label;
    variantWeight = pattern.getWeight ? pattern.getWeight(match) : pattern.weight;
    if (pattern.getDimensions) {
      const dimensions = pattern.getDimensions(match) || {};
      imageWidth = Number.isFinite(dimensions.width) ? dimensions.width : null;
      imageHeight = Number.isFinite(dimensions.height) ? dimensions.height : null;
    }
    variantMatched = true;
    break;
  }

  const familyKey = variantMatched ? `${directory}/${familyStem}` : "";
  const candidateFamilyKey = `${directory}/${stem}`;

  return {
    fullPath,
    fileName,
    directory,
    stem,
    extension,
    familyStem,
    familyKey,
    candidateFamilyKey,
    variantLabel,
    variantWeight,
    variantMatched,
    imageWidth,
    imageHeight,
    displayName: humanizeStem(familyStem || stem) || fileName,
  };
};

const groupS3Records = (records = []) => {
  const parsedRecords = (Array.isArray(records) ? records : []).map((record) => ({
    record,
    ...parseImageVariantInfo(record),
  }));

  const familyKeys = new Set(
    parsedRecords.filter((item) => item.variantMatched).map((item) => item.familyKey)
  );
  const grouped = new Map();

  parsedRecords.forEach((item) => {
    const groupKey =
      item.familyKey || (familyKeys.has(item.candidateFamilyKey) ? item.candidateFamilyKey : item.record.id);

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, []);
    }
    grouped.get(groupKey).push(item);
  });

  return Array.from(grouped.entries())
    .map(([groupKey, members]) => {
      const sortedMembers = [...members].sort(
        (left, right) =>
          (right.variantWeight || 0) - (left.variantWeight || 0) ||
          String(left.fullPath || "").localeCompare(String(right.fullPath || ""))
      );
      const previewInfo = sortedMembers[0];
      const previewRecord = previewInfo.record;
      const isFamilyGroup = sortedMembers.length > 1 || sortedMembers.some((item) => item.variantMatched);
      const variantLabels = Array.from(
        new Set(
          sortedMembers
            .map((item) => item.variantLabel || (item.variantMatched ? "original" : ""))
            .filter(Boolean)
        )
      );

      return {
        id: groupKey,
        members: sortedMembers,
        previewRecord,
        previewInfo,
        isFamilyGroup,
        variantLabels,
        displayName: isFamilyGroup ? previewInfo.displayName : previewRecord?.name || previewRecord?.full_path,
        title: previewRecord?.name || previewRecord?.full_path || previewInfo.displayName,
      };
    })
    .sort((left, right) =>
      String(left.previewInfo?.fullPath || left.previewRecord?.full_path || "").localeCompare(
        String(right.previewInfo?.fullPath || right.previewRecord?.full_path || "")
      )
    );
};

const S3_BROWSER_FILTERS = [
  <SearchInput
    key="s3-browser-search"
    source="q"
    alwaysOn
    placeholder="Search bucket objects"
    variant="outlined"
  />,
];

const S3BrowserActions = () => {
  const refresh = useRefresh();

  return (
    <TopToolbar sx={{ gap: 1 }}>
      <Button variant="outlined" onClick={() => refresh()}>
        Refresh
      </Button>
    </TopToolbar>
  );
};

const S3BrowserHeader = ({ visibleCount, objectCount, total }) => {
  
  return (
    <Card elevation={0} sx={{ mb: 2, border: "1px solid #d8e6e6" }}>
      <CardContent>
        <Stack spacing={1.25}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CloudOutlinedIcon sx={{ color: "#007073" }} />
            <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#007073" }}>
              S3 Browser
            </Typography>
          </Box>
          <Typography sx={{ color: "#424242" }}>
            Flat, paginated listing of every object in the configured AWS S3 bucket.
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Chip label={`Groups ${visibleCount}`} sx={{ backgroundColor: "#d8e6e6" }} />
            <Chip label={`Objects ${objectCount}`} sx={{ backgroundColor: "#e8f4f4" }} />
            <Chip label={`Total ${total ?? 0}`} sx={{ backgroundColor: "#f3f9f9" }} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

const S3ObjectCard = ({ group }) => {
  const record = group.previewRecord;
  const previewUrl = record?.effective_url || record?.public_url || "";
  const isImage = isImageRecord(record);
  const previewWidth = Number.isFinite(group.previewInfo?.imageWidth) ? group.previewInfo.imageWidth : null;
  const previewHeight = Number.isFinite(group.previewInfo?.imageHeight) ? group.previewInfo.imageHeight : null;
  const hasExplicitDimensions = Boolean(previewWidth && previewHeight);
  const displayWidth = hasExplicitDimensions ? Math.min(previewWidth, 220) : null;
  const displayHeight = hasExplicitDimensions ? Math.min(previewHeight, 220) : null;

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 24px rgba(0,112,115,0.08)" },
      }}
    >
      <CardContent>
        <Stack spacing={1.25}>
          <Box
            sx={{
              width: "100%",
              minHeight: 160,
              borderRadius: 2,
              border: "1px solid #d8e6e6",
              backgroundColor: "#f3f9f9",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 1,
            }}
          >
            {isImage && previewUrl ? (
              <Box
                component="img"
                src={previewUrl}
                alt={group.title || record?.name || record?.full_path}
                sx={
                  hasExplicitDimensions
                    ? {
                        width: `${displayWidth}px`,
                        height: `${displayHeight}px`,
                        objectFit: "contain",
                        maxWidth: "100%",
                        maxHeight: "100%",
                      }
                    : {
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }
                }
              />
            ) : (
              <InsertDriveFileOutlinedIcon sx={{ fontSize: 46, color: "#007073" }} />
            )}
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#262626", wordBreak: "break-word" }}>
              {group.title || record?.name || record?.full_path}
            </Typography>
            <Typography sx={{ mt: 0.25, fontSize: 12, color: "#666", wordBreak: "break-word" }}>
              {group.isFamilyGroup ? `${group.members.length} grouped variants` : record?.full_path}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            <Chip label={formatBytes(record?.size_bytes)} size="small" sx={{ backgroundColor: "#d8e6e6" }} />
            <Chip label={record?.storage_class || "STANDARD"} size="small" sx={{ backgroundColor: "#f3f9f9" }} />
            {group.isFamilyGroup ? (
              <Chip label={`${group.members.length} variants`} size="small" sx={{ backgroundColor: "#eef7f7" }} />
            ) : null}
            {group.previewInfo?.variantLabel ? (
              <Chip label={group.previewInfo.variantLabel} size="small" sx={{ backgroundColor: "#eef7f7" }} />
            ) : null}
            {hasExplicitDimensions ? (
              <Chip label={`${previewWidth}x${previewHeight}`} size="small" sx={{ backgroundColor: "#eef7f7" }} />
            ) : null}
            {record?.size_bytes === 0 ? (
              <Chip label="Zero-byte" size="small" sx={{ backgroundColor: "#fff1ec", color: "#731d00" }} />
            ) : null}
          </Box>

          {group.variantLabels.length ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {group.variantLabels.map((label) => (
                <Chip key={label} label={label} size="small" variant="outlined" />
              ))}
            </Box>
          ) : null}

          <Box sx={{ display: "flex", gap: 0.75, justifyContent: "space-between", alignItems: "center" }}>
            <Typography sx={{ fontSize: 11, color: "#666" }}>
              {formatDateTime(record?.last_modified)}
            </Typography>
            <ShowButton resource="admin/s3-browser" record={record} label="Details" />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

const S3BrowserGrid = ({ groups }) => {
  const { isLoading } = useListContext();

  if (isLoading) {
    return <Typography sx={{ color: "#4b5563" }}>Loading S3 objects...</Typography>;
  }

  if (!groups.length) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ color: "#4b5563" }}>
            No objects found in this bucket.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
      }}
    >
      {groups.map((group) => (
        <Box key={group.id}>
          <S3ObjectCard group={group} />
        </Box>
      ))}
    </Box>
  );
};

const S3BrowserListContent = () => {
  const { data = [], total } = useListContext();
  const groups = React.useMemo(() => groupS3Records(data), [data]);

  return (
    <>
      <S3BrowserHeader visibleCount={groups.length} objectCount={data.length} total={total} />
      <S3BrowserGrid groups={groups} />
    </>
  );
};

export const S3BrowserList = () => (
  <List
    perPage={24}
    sort={{ field: "full_path", order: "ASC" }}
    filters={S3_BROWSER_FILTERS}
    actions={<S3BrowserActions />}
    pagination={<Pagination rowsPerPageOptions={[24, 48, 96]} />}
    empty={false}
  >
    <S3BrowserListContent />
  </List>
);

const S3DetailPreview = ({ record }) => {
  const previewUrl = record?.effective_url || record?.public_url || "";
  const isImage = isImageRecord(record);
  const imageInfo = parseImageVariantInfo(record);
  const hasExplicitDimensions = Boolean(imageInfo.imageWidth && imageInfo.imageHeight);
  if (!isImage || !previewUrl) return null;

  return (
    <Card variant="outlined" sx={{ overflow: "hidden" }}>
      <CardContent>
        <Box
          component="img"
          src={previewUrl}
          alt={record?.name || record?.full_path || "S3 object"}
          sx={
            hasExplicitDimensions
              ? {
                  width: `${Math.min(imageInfo.imageWidth, 420)}px`,
                  height: `${Math.min(imageInfo.imageHeight, 420)}px`,
                  objectFit: "contain",
                  display: "block",
                  backgroundColor: "#f3f9f9",
                }
              : {
                  width: "100%",
                  maxHeight: 420,
                  objectFit: "contain",
                  display: "block",
                  backgroundColor: "#f3f9f9",
                }
          }
        />
      </CardContent>
    </Card>
  );
};

const S3BrowserShowContent = () => {
  const record = useRecordContext();
  if (!record) return null;
  const imageInfo = parseImageVariantInfo(record);

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.25}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
              <Box>
                <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#007073" }}>
                  {record.name || record.full_path}
                </Typography>
                <Typography sx={{ mt: 0.25, fontSize: 13, color: "#666", wordBreak: "break-all" }}>
                  {record.full_path}
                </Typography>
              </Box>
              <Chip
                label={record.content_type || "Object"}
                sx={{ backgroundColor: "#d8e6e6", color: "#262626", fontWeight: 700 }}
              />
              {imageInfo.variantLabel ? (
                <Chip
                  label={imageInfo.variantLabel}
                  sx={{ backgroundColor: "#eef7f7", color: "#262626", fontWeight: 700 }}
                />
              ) : null}
            </Box>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                component="a"
                href={record.public_url || record.effective_url || "#"}
                target="_blank"
                rel="noreferrer"
                variant="contained"
                endIcon={<OpenInNewOutlinedIcon />}
                disabled={!record.public_url && !record.effective_url}
              >
                Open object
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <S3DetailPreview record={record} />

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1 }}>
            Object Details
          </Typography>
          <SimpleShowLayout>
            <RaTextField source="bucket" label="Bucket" />
            <RaTextField source="type" label="Type" />
            <RaTextField source="content_type" label="Content Type" />
            <RaTextField source="storage_class" label="Storage Class" />
            <RaTextField source="size_bytes" label="Size (bytes)" />
            <RaTextField source="etag" label="ETag" />
            <RaTextField source="last_modified" label="Last Modified" />
            <RaTextField source="cache_control" label="Cache Control" />
            <RaTextField source="content_disposition" label="Content Disposition" />
            <RaTextField source="content_encoding" label="Content Encoding" />
            <RaTextField source="content_language" label="Content Language" />
            <RaTextField source="expires" label="Expires" />
          </SimpleShowLayout>
        </CardContent>
      </Card>

      {record.metadata && Object.keys(record.metadata || {}).length ? (
        <Card variant="outlined">
          <CardContent>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1 }}>
              Metadata
            </Typography>
            <Box sx={{ display: "grid", gap: 0.75 }}>
              {Object.entries(record.metadata).map(([key, value]) => (
                <Box key={key} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography sx={{ fontSize: 14, color: "#666" }}>{key}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#262626", wordBreak: "break-all" }}>
                    {String(value)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
};

export const S3BrowserShow = () => (
  <Show>
    <S3BrowserShowContent />
  </Show>
);
