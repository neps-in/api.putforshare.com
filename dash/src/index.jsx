import CloseIcon from "@mui/icons-material/Close";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import ReceiptOutlinedIcon from "@mui/icons-material/ReceiptOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { CssBaseline } from "@mui/material";
import React from "react";
import { ThemeProvider } from "@mui/material/styles";
import {
  Admin,
  ArrayField,
  AutocompleteArrayInput,
  AutocompleteInput,
  BooleanField,
  BooleanInput,
  Create,
  CreateButton,
  CustomRoutes,
  Datagrid,
  DateField,
  DateInput,
  DeleteButton,
  Edit,
  EditButton,
  FilterButton,
  FunctionField,
  FormDataConsumer,
  ImageField,
  ImageInput,
  Layout,
  List,
  Menu as RaMenu,
  NumberField,
  NumberInput,
  TextField as RaTextField,
  Resource,
  ReferenceInput,
  SaveButton,
  SearchInput,
  SelectArrayInput,
  SelectInput,
  Show,
  ShowButton,
  SimpleForm,
  SimpleShowLayout,
  TextInput,
  Toolbar,
  TopToolbar,
  useDataProvider,
  useGetIdentity,
  useGetList,
  useInput,
  useListContext,
  useLogin,
  useLogout,
  useNotify,
  usePermissions,
  useRefresh,
  useRecordContext,
  useResourceContext,
  useRedirect,
  useSidebarState,
  required,
} from "react-admin";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Link as RouterLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useFormContext } from "react-hook-form";
import bookBacksideIsbnNumber from "./assets/book-backside-isbn-number.jpg";
import cardBoardBox from "./assets/card-board-box.png";
import logo from "./assets/pfs-logo-svg-bg-transperant.svg";
import {
  authProvider,
  firstErrorMessage,
  generateUsername,
  getStoredUser,
  getStoredToken,
  normalizeFieldErrors,
  requestApi,
  saveSession,
} from "./providers/authProvider";
import { dataProvider, fetchInventoryIsbnMetadata } from "./providers/dataProvider";
import { EarningsPage } from "./earningcalc/earnings";
import { S3BrowserList, S3BrowserShow } from "./s3browser/browser";
import { brandTheme } from "./theme";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.putforshare.com/api/v1";
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "";
  }
})();

const toAbsoluteUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `${window.location.protocol}${raw}`;
  if (raw.startsWith("/") && API_ORIGIN) return `${API_ORIGIN}${raw}`;
  return raw;
};

const AuthShell = ({ title, subtitle, children, backgroundSx, cardSx }) => (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background:
        backgroundSx ||
        "linear-gradient(145deg, rgba(0,112,115,0.15) 0%, rgba(245,247,250,1) 45%, rgba(255,255,255,1) 100%)",
      p: 2,
    }}
  >
    <Card sx={{ width: "100%", maxWidth: 480, ...cardSx }}>
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.25,
          }}
        >
          <Box
            component="img"
            src={logo}
            alt="PutForShare logo"
            sx={{
              width: 50,
              height: 50,
              objectFit: "contain",
              backgroundColor: "#f3f9f9",
              borderRadius: 1,
              p: 0.5,
            }}
          />
          <Typography
            component="h2"
            sx={{
              m: 0,
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#007073",
            }}
          >
            PutForShare
          </Typography>
        </Box>
        <Typography
          component="h1"
          sx={{ fontSize: 28, fontWeight: 700, color: "#007073" }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography sx={{ mt: 0.5, mb: 2, color: "#4b5563" }}>
            {subtitle}
          </Typography>
        ) : null}
        <Stack spacing={1.5}>{children}</Stack>
      </CardContent>
    </Card>
  </Box>
);

const ADDRESS_TYPE_CHOICES = [
  { id: "RESIDENCE", name: "Residence (7am to 9pm delivery time)" },
  { id: "OFFICE", name: "Commercial (7am to 9pm delivery time)" },
];

const PICKUP_STATUS_CHOICES = [
  { id: "DRAFT", name: "Draft" },
  { id: "BOOKED", name: "Booked" },
  { id: "REQUEST_CANCEL", name: "Request Cancel" },
  { id: "READY_FOR_PICKUP", name: "Ready For Pickup" },
  { id: "CANCELLED", name: "Cancelled" },
  { id: "PICKED_UP_AND_IN_TRANSIT", name: "Picked Up and In Transit" },
  { id: "PICKUP_REJECTED", name: "Pickup Rejected" },
  { id: "RECEIVED", name: "Received" },
  { id: "RETURNED", name: "Returned" },
];

const PICKUP_MODE_CHOICES = [
  { id: "AIRWAYS_PRIORITY", name: "Airways Priority" },
  { id: "ROADWAYS_ECONOMY", name: "Roadways Economy" },
];

const INVENTORY_SELL_OPTION_CHOICES = [
  { id: "SELF_SELL", name: "Self Sell" },
  { id: "SMART_SELL", name: "Smart Sell" },
  { id: "DONATE_100", name: "Donate 100%" },
  { id: "DONATE_50", name: "Donate 50%" },
];

const BOOK_QUALITY_CHOICES = [
  { id: "NEW", name: "New" },
  { id: "USED_LOOKS_NEW", name: "Used - Looks Like New" },
  { id: "USED_LOOKS_GOOD", name: "Used - Looks Good" },
  { id: "USED_ACCEPTABLE", name: "Used - Acceptable" },
];

const PRODUCT_FORMAT_CHOICES = [
  { id: "PAPERBACK", name: "Paperback" },
  { id: "HARDCOVER", name: "Hard Cover" },
  { id: "CARD_BOOK", name: "Card Book (Book with Cards as Pages)" },
];

const PRODUCT_CATEGORY_KIND_CHOICES = [
  { id: "BOOK", name: "Book" },
  { id: "SOAP", name: "Soap" },
  { id: "OTHERS", name: "Others" },
];

const getInventoryQualityChoices = (formData = {}) => {
  const backendChoices = formData?.quality_choices;
  if (Array.isArray(backendChoices) && backendChoices.length) {
    return backendChoices;
  }
  return BOOK_QUALITY_CHOICES;
};

const getInventoryQualityLabel = (record = {}) => {
  if (String(record?.product_type || "").toUpperCase() !== "BOOK") {
    return "";
  }
  const choices = getInventoryQualityChoices(record);
  const match = choices.find((choice) => choice.id === record?.quality);
  return match?.name || record?.quality || "";
};

const inventoryFormTransform = (data = {}) => {
  const payload = { ...data };
  const productKind = String(payload.product_category_kind || "BOOK").toUpperCase();

  delete payload.quality_choices;
  delete payload.quality_label;
  delete payload.product_type;

  if (productKind !== "BOOK") {
    delete payload.quality;
    delete payload.quality_note;
  }

  return payload;
};

const USER_PLAN_CHOICES = [
  { id: "SELF_SELL", name: "Self Sell" },
  { id: "SMART_SELL", name: "Smart Sell" },
  { id: "DONATE_100", name: "Donate 100%" },
  { id: "DONATE_50", name: "Donate 50%" },
];

const canManageSellerInventory = (plan) => plan === "SELF_SELL";

const USER_ROLE_CHOICES = [
  { id: "ADMIN", name: "Admin" },
  { id: "SELLER", name: "Seller" },
  { id: "CUSTOMER", name: "Customer" },
  { id: "GUEST", name: "Guest" },
];

const ADMIN_USER_STATUS_CHOICES = [
  { id: "true", name: "Active" },
  { id: "false", name: "Inactive" },
];

const DATE_RANGE_CHOICES = [
  { id: "today", name: "Today" },
  { id: "week", name: "This Week" },
  { id: "month", name: "This Month" },
];

const ORDER_STATUS_CHOICES = [
  { id: "DRAFT", name: "Draft" },
  { id: "PENDING_PAYMENT", name: "Pending Payment" },
  { id: "PAID", name: "Paid" },
  { id: "PAYMENT_FAILED", name: "Payment Failed" },
  { id: "CANCELLED", name: "Cancelled" },
  { id: "FULFILLED", name: "Fulfilled" },
  { id: "REFUNDED", name: "Refunded" },
];

const ORDER_PAYMENT_STATUS_CHOICES = [
  { id: "UNPAID", name: "Unpaid" },
  { id: "PENDING", name: "Pending" },
  { id: "PAID", name: "Paid" },
  { id: "FAILED", name: "Failed" },
  { id: "REFUNDED", name: "Refunded" },
];

const PROFILE_URL_PREFIX = "https://putforshare.com/@";
const COOL_PLANT_PREFIXES = [
  "wild",
  "urban",
  "moon",
  "sun",
  "neo",
  "aqua",
  "leafy",
  "green",
  "zen",
  "bloom",
];
const COOL_PLANT_NAMES = [
  "lotus",
  "fern",
  "tulip",
  "ivy",
  "bamboo",
  "jasmine",
  "lavender",
  "aloe",
  "mint",
  "sage",
  "cedar",
  "willow",
];

const generateCoolPlantUsername = () => {
  const first =
    COOL_PLANT_PREFIXES[Math.floor(Math.random() * COOL_PLANT_PREFIXES.length)];
  const second =
    COOL_PLANT_NAMES[Math.floor(Math.random() * COOL_PLANT_NAMES.length)];
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${first}_${second}${suffix}`
    .replace(/[^a-z0-9_]/gi, "")
    .toLowerCase();
};

const PACKAGE_RESOURCE_TITLE = "My Packages";
const PACKAGE_RESOURCE_BRIEF =
  "Packages are card board boxes where you can keep books inside";
const PICKUP_RESOURCE_TITLE = "My Pickup Request";
const PICKUP_RESOURCE_BRIEF =
  "If you have choosen Smart Sell or Donate option, book FREE pickup request to send the books to PutForShare warehouse";
const INVENTORY_RESOURCE_TITLE = "My Inventories";
const INVENTORY_RESOURCE_BRIEF =
  "Manage your products and search by title, ISBN, author, or publisher.";
const AUTHOR_RESOURCE_TITLE = "Authors";
const AUTHOR_RESOURCE_BRIEF = "Maintain author master data used in inventory books.";
const PUBLISHER_RESOURCE_TITLE = "Publishers";
const PUBLISHER_RESOURCE_BRIEF = "Maintain publisher master data used in inventory books.";
const PHOTO_RESOURCE_TITLE = "Photos";
const PHOTO_RESOURCE_BRIEF = "Manage photo metadata and image URLs used across resources.";
const ADDRESS_RESOURCE_TITLE = "My Addresses";
const ADDRESS_RESOURCE_BRIEF =
  "Save pickup and delivery addresses with clear labels like Home, Office, or Warehouse.";
const ADMIN_ADDRESS_RESOURCE_TITLE = "Address Book";
const ADMIN_ADDRESS_RESOURCE_BRIEF = "Manage all saved user addresses in one place.";
const ADMIN_INVENTORY_RESOURCE_TITLE = "Inventories";
const ADMIN_INVENTORY_RESOURCE_BRIEF = "Oversee inventory listings across all sellers.";
const ADMIN_PACKAGE_RESOURCE_TITLE = "Packages";
const ADMIN_PACKAGE_RESOURCE_BRIEF = "Track package records and owner assignments.";
const ADMIN_PICKUP_RESOURCE_TITLE = "Pickup Requests";
const ADMIN_PICKUP_RESOURCE_BRIEF = "Monitor pickup schedules and status updates.";
const SERVICABILITY_CHECK_RESOURCE_TITLE = "Servicability Check";
const SERVICABILITY_CHECK_RESOURCE_BRIEF =
  "Search pincode serviceability and view post office coverage details.";
const ADMIN_USER_RESOURCE_TITLE = "Users";
const ADMIN_USER_RESOURCE_BRIEF =
  "Manage all user accounts, access roles, and plan status in one place.";

const ResourceIntro = ({ title, brief }) => {
  React.useEffect(() => {
    document.title = `${title} | PutForShare`;
  }, [title]);

  return (
    <Box sx={{ m: "10px" }}>
      <Typography
        component="h2"
        sx={{ fontSize: 30, fontWeight: 700, color: "#0A4A47", mb: 0.5 }}
      >
        {title}
      </Typography>
      <Typography sx={{ color: "#4b5563" }}>{brief}</Typography>
    </Box>
  );
};

const PackageResourceIntro = () => (
  <ResourceIntro title={PACKAGE_RESOURCE_TITLE} brief={PACKAGE_RESOURCE_BRIEF} />
);

const PickupRequestResourceIntro = () => (
  <ResourceIntro title={PICKUP_RESOURCE_TITLE} brief={PICKUP_RESOURCE_BRIEF} />
);

const InventoryResourceIntro = () => (
  <ResourceIntro title={INVENTORY_RESOURCE_TITLE} brief={INVENTORY_RESOURCE_BRIEF} />
);

const InventoryListActions = () => {
  const { identity } = useGetIdentity();
  const canManage = canManageSellerInventory(identity?.plan);

  return (
    <TopToolbar>
      <FilterButton />
      {canManage ? <CreateButton label="Add inventory" /> : null}
    </TopToolbar>
  );
};

const AuthorResourceIntro = () => (
  <ResourceIntro title={AUTHOR_RESOURCE_TITLE} brief={AUTHOR_RESOURCE_BRIEF} />
);

const PublisherResourceIntro = () => (
  <ResourceIntro title={PUBLISHER_RESOURCE_TITLE} brief={PUBLISHER_RESOURCE_BRIEF} />
);

const PhotoResourceIntro = () => (
  <ResourceIntro title={PHOTO_RESOURCE_TITLE} brief={PHOTO_RESOURCE_BRIEF} />
);

const AddressResourceIntro = () => (
  <ResourceIntro title={ADDRESS_RESOURCE_TITLE} brief={ADDRESS_RESOURCE_BRIEF} />
);
const AdminUserResourceIntro = () => (
  <ResourceIntro title={ADMIN_USER_RESOURCE_TITLE} brief={ADMIN_USER_RESOURCE_BRIEF} />
);
const AdminAddressResourceIntro = () => (
  <ResourceIntro title={ADMIN_ADDRESS_RESOURCE_TITLE} brief={ADMIN_ADDRESS_RESOURCE_BRIEF} />
);
const AdminInventoryResourceIntro = () => (
  <ResourceIntro title={ADMIN_INVENTORY_RESOURCE_TITLE} brief={ADMIN_INVENTORY_RESOURCE_BRIEF} />
);
const AdminPackageResourceIntro = () => (
  <ResourceIntro title={ADMIN_PACKAGE_RESOURCE_TITLE} brief={ADMIN_PACKAGE_RESOURCE_BRIEF} />
);
const AdminPickupResourceIntro = () => (
  <ResourceIntro title={ADMIN_PICKUP_RESOURCE_TITLE} brief={ADMIN_PICKUP_RESOURCE_BRIEF} />
);
const ServicabilityCheckResourceIntro = () => {
  const resource = useResourceContext();
  const isAdminPincode = resource === "admin/pincodes";
  return (
    <ResourceIntro
      title={isAdminPincode ? "Admin Pincodes" : SERVICABILITY_CHECK_RESOURCE_TITLE}
      brief={
        isAdminPincode
          ? "Operate full pincode master records with complete serviceability, contact, and geo metadata."
          : SERVICABILITY_CHECK_RESOURCE_BRIEF
      }
    />
  );
};

const SERVICABILITY_CHECK_FILTERS = [
  <SearchInput
    key="servicability-check-search"
    source="q"
    alwaysOn
    placeholder="Search by pincode or location text"
    variant="outlined"
  />,
  <TextInput
    key="servicability-check-pincode"
    source="pincode"
    label="Pincode"
    placeholder="e.g. 605110"
    variant="outlined"
  />,
  <TextInput
    key="servicability-check-state"
    source="state_name"
    label="State"
    placeholder="e.g. PONDICHERRY"
    variant="outlined"
  />,
  <SelectInput
    key="servicability-check-region"
    source="region"
    label="Region"
    choices={[
      { id: "North", name: "North" },
      { id: "South", name: "South" },
      { id: "East", name: "East" },
      { id: "West", name: "West" },
      { id: "Central", name: "Central" },
      { id: "North East", name: "North East" },
      { id: "Islands", name: "Islands" },
      { id: "Metro", name: "Metro" },
    ]}
    variant="outlined"
  />,
  <SelectInput
    key="servicability-check-metro"
    source="metro"
    label="Metro"
    choices={[
      { id: "1", name: "Yes" },
      { id: "0", name: "No" },
    ]}
    variant="outlined"
  />,
];

const ServicabilityCheckListActions = () => {
  const { identity } = useGetIdentity();
  const resource = useResourceContext();
  const canEdit = identity?.pfs_role === "ADMIN" && resource === "admin/pincodes";

  return (
    <TopToolbar>
      <FilterButton />
      {canEdit ? <CreateButton label="Add pincode" /> : null}
    </TopToolbar>
  );
};

const ServicabilityCheckListCards = () => {
  const { data = [], isLoading } = useListContext();
  const { identity } = useGetIdentity();
  const resource = useResourceContext();
  const canEdit = identity?.pfs_role === "ADMIN" && resource === "admin/pincodes";

  if (isLoading) {
    return <Typography sx={{ mt: 1.5, color: "#4b5563" }}>Loading pincodes...</Typography>;
  }

  if (!data.length) {
    return <Typography sx={{ mt: 1.5, color: "#4b5563" }}>No pincodes found.</Typography>;
  }

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {data.map((record) => (
        <Card key={record.id || record.pk} sx={{ border: "1px solid #e5e7eb" }}>
          <CardContent sx={{ pb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 1 }}>
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  {record.office_name || "Post Office"}
                </Typography>
                <Typography sx={{ mt: 0.25, fontSize: 13, color: "#6b7280" }}>
                  Pincode: {record.pincode || "-"}
                </Typography>
              </Box>
              {record.is_active !== false ? (
                <Box
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: 999,
                    backgroundColor: "#dcfce7",
                    color: "#166534",
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  ✓ Active
                </Box>
              ) : null}
            </Box>

            <Typography sx={{ mt: 1, fontSize: 13, color: "#374151" }}>
              {[
                record.taluk,
                record.district_name,
                record.state_name,
              ]
                .filter(Boolean)
                .join(", ") || "-"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 12, color: "#6b7280" }}>
              {[
                record.delivery_status,
                record.division_name,
                record.region_name,
                record.circle_name,
              ]
                .filter(Boolean)
                .join(" | ") || "-"}
            </Typography>

            {record.embargo ? (
              <Box
                sx={{
                  mt: 1,
                  px: 1.25,
                  py: 0.5,
                  width: "fit-content",
                  borderRadius: 999,
                  backgroundColor: "#fee2e2",
                  color: "#991b1b",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ! Embargo
              </Box>
            ) : null}

            {record.remark ? (
              <Typography sx={{ mt: 1, fontSize: 13, color: "#4b5563" }}>
                Remark: {record.remark}
              </Typography>
            ) : null}
          </CardContent>
          {canEdit ? (
            <CardActions sx={{ justifyContent: "flex-end", px: 2, pb: 1.5, pt: 0 }}>
              <ShowButton record={record} />
              <EditButton record={record} />
            </CardActions>
          ) : null}
        </Card>
      ))}
    </Box>
  );
};

const ServicabilityCheckList = () => {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("md"));
  const { identity } = useGetIdentity();
  const resource = useResourceContext();
  const canEdit = identity?.pfs_role === "ADMIN" && resource === "admin/pincodes";

  return (
    <List
      filters={SERVICABILITY_CHECK_FILTERS}
      perPage={25}
      sort={{ field: "updated_on", order: "DESC" }}
      empty={false}
      actions={<ServicabilityCheckListActions />}
    >
      <>
        <ServicabilityCheckResourceIntro />
        {isMobile ? (
          <ServicabilityCheckListCards />
        ) : (
          <Datagrid bulkActionButtons={false} rowClick={canEdit ? "edit" : false}>
            <NumberField source="pk" label="ID" />
            <RaTextField source="office_name" label="Office Name" />
            <RaTextField source="pincode" label="Pincode" />
            <RaTextField source="delivery_status" label="Delivery Status" />
            <BooleanField source="embargo" label="Embargo" />
            <RaTextField source="remark" label="Remark" />
            <RaTextField source="division_name" label="Division Name" />
            <RaTextField source="region_name" label="Region Name" />
            <RaTextField source="circle_name" label="Circle Name" />
            <RaTextField source="taluk" label="Taluk" />
            <RaTextField source="district_name" label="District Name" />
            <RaTextField source="state_name" label="State Name" />
            <RaTextField source="region" label="Region" />
            <BooleanField source="metro" label="Metro" />
            {canEdit ? (
              <FunctionField
                label="Actions"
                sortable={false}
                render={(record) => (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                    <ShowButton record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
                    <EditButton record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
                  </Box>
                )}
              />
            ) : null}
          </Datagrid>
        )}
      </>
    </List>
  );
};

const PincodeFormFields = ({ isEdit = false }) => (
  <Stack spacing={2}>
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: "#cde6e5",
        background:
          "linear-gradient(180deg, rgba(240,252,251,0.75) 0%, rgba(255,255,255,1) 80%)",
      }}
    >
      <CardContent>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#0A4A47", mb: 1.5 }}>
          Location Core
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          }}
        >
          <TextInput source="office_name" label="Office Name" variant="outlined" fullWidth />
          <TextInput source="pincode" label="Pincode" variant="outlined" fullWidth />
          <TextInput source="office_type" label="Office Type" variant="outlined" fullWidth />
          <TextInput source="delivery_status" label="Delivery Status" variant="outlined" fullWidth />
          <TextInput source="division_name" label="Division Name" variant="outlined" fullWidth />
          <TextInput source="region_name" label="Region Name" variant="outlined" fullWidth />
          <TextInput source="circle_name" label="Circle Name" variant="outlined" fullWidth />
          <TextInput source="taluk" label="Taluk" variant="outlined" fullWidth />
          <TextInput source="district_name" label="District Name" variant="outlined" fullWidth />
          <TextInput source="state_name" label="State Name" variant="outlined" fullWidth />
          <TextInput source="state_short_name" label="State Short Code" variant="outlined" fullWidth />
        </Box>
      </CardContent>
    </Card>

    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>
          Contact and Linking
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          }}
        >
          <TextInput source="telephone" label="Telephone" variant="outlined" fullWidth />
          <TextInput source="alternate_telephone" label="Alternate Telephone" variant="outlined" fullWidth />
          <TextInput source="mobile_number" label="Mobile Number" variant="outlined" fullWidth />
          <TextInput source="head_post_master" label="Head Post Master" variant="outlined" fullWidth />
          <TextInput
            source="head_post_master_mobile_number"
            label="Head Post Master Mobile"
            variant="outlined"
            fullWidth
          />
          <TextInput source="related_suboffice" label="Related Suboffice" variant="outlined" fullWidth />
          <TextInput source="related_headoffice" label="Related Headoffice" variant="outlined" fullWidth />
          <TextInput source="plus_code" label="Plus Code" variant="outlined" fullWidth />
          <TextInput
            source="post_office_address"
            label="Post Office Address"
            variant="outlined"
            fullWidth
            multiline
            minRows={2}
            sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}
          />
        </Box>
      </CardContent>
    </Card>

    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>
          Geo and Controls
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          }}
        >
          <TextInput source="po_latitude" label="PO Latitude" variant="outlined" fullWidth />
          <TextInput source="po_longitude" label="PO Longitude" variant="outlined" fullWidth />
          <TextInput source="latitude" label="Latitude" variant="outlined" fullWidth />
          <TextInput source="longitude" label="Longitude" variant="outlined" fullWidth />
          <BooleanInput source="embargo" />
          <BooleanInput source="is_active" />
          {isEdit ? <BooleanInput source="is_archived" /> : null}
          <TextInput
            source="remark"
            label="Remark"
            variant="outlined"
            fullWidth
            multiline
            minRows={2}
            sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}
          />
        </Box>
      </CardContent>
    </Card>
  </Stack>
);

const PincodeCreate = () => (
  <Create>
    <SimpleForm defaultValues={{ is_active: true, embargo: false, is_archived: false }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>
        Create Pincode
      </Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
        Add a pincode profile with serviceability and contact metadata.
      </Typography>
      <PincodeFormFields />
    </SimpleForm>
  </Create>
);

const PincodeEdit = () => (
  <Edit>
    <SimpleForm>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>
        Edit Pincode
      </Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
        Update operational and routing details for this pincode.
      </Typography>
      <PincodeFormFields isEdit />
    </SimpleForm>
  </Edit>
);

const PincodeShowContent = () => {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>
            Location Core
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr" }, rowGap: 0.75 }}>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Office Name</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.office_name || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Pincode</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.pincode || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Office Type</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.office_type || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Delivery Status</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.delivery_status || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Hierarchy</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>
              {[record?.division_name, record?.region_name, record?.circle_name].filter(Boolean).join(" / ") || "-"}
            </Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Area</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>
              {[record?.taluk, record?.district_name, record?.state_name, record?.state_short_name]
                .filter(Boolean)
                .join(", ") || "-"}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>
            Contact and Geo
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr" }, rowGap: 0.75 }}>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Telephone</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.telephone || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Alternate Telephone</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.alternate_telephone || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Mobile Number</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.mobile_number || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Head Post Master</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.head_post_master || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Head PM Mobile</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.head_post_master_mobile_number || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Related Offices</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>
              {[record?.related_suboffice, record?.related_headoffice].filter(Boolean).join(" / ") || "-"}
            </Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Post Office Address</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.post_office_address || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Plus Code</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.plus_code || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Coordinates</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>
              {[`PO(${record?.po_latitude || "-"}, ${record?.po_longitude || "-"})`, `(${record?.latitude || "-"}, ${record?.longitude || "-"})`].join(" | ")}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>
            Flags and Audit
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr" }, rowGap: 0.75 }}>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Embargo</Typography>
            <Typography sx={{ fontSize: 14, color: record?.embargo ? "#991b1b" : "#111827" }}>
              {record?.embargo ? "Yes" : "No"}
            </Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Active</Typography>
            <Typography sx={{ fontSize: 14, color: record?.is_active ? "#166534" : "#991b1b" }}>
              {record?.is_active ? "Yes" : "No"}
            </Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Archived</Typography>
            <Typography sx={{ fontSize: 14, color: record?.is_archived ? "#991b1b" : "#111827" }}>
              {record?.is_archived ? "Yes" : "No"}
            </Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Remark</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.remark || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Created On</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{formatDateTime(record?.created_on)}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Updated On</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{formatDateTime(record?.updated_on)}</Typography>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
};

const PincodeShow = () => (
  <Show>
    <PincodeShowContent />
  </Show>
);

const SHIPPING_LABEL_DOWNLOAD_STATUSES = new Set([
  "BOOKED",
  "READY_FOR_PICKUP",
]);

const canShowShippingLabelDownload = (status) =>
  SHIPPING_LABEL_DOWNLOAD_STATUSES.has(
    String(status || "")
      .trim()
      .toUpperCase()
  );

const AddressListActions = () => (
  <TopToolbar>
    <CreateButton resource="my/address" label="Add address" />
  </TopToolbar>
);

const normalizePincode = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, 6);

const AddressPincodeInput = () => {
  const provider = useDataProvider();
  const { setValue } = useFormContext();
  const { field, fieldState } = useInput({ source: "pincode" });
  const [isChecking, setIsChecking] = React.useState(false);
  const [lookupMessage, setLookupMessage] = React.useState(null);
  const activeLookupRef = React.useRef(0);
  const lastLookupRef = React.useRef("");

  const handleLookup = React.useCallback(
    async (rawValue) => {
      const clean = normalizePincode(rawValue);
      if (field.value !== clean) {
        field.onChange(clean);
      }

      if (clean.length !== 6) {
        setLookupMessage({
          isValid: false,
          serviceAvailable: false,
          invalidText: "Invalid pincode",
          serviceText: "",
        });
        return;
      }

      if (lastLookupRef.current === clean) return;
      lastLookupRef.current = clean;

      setIsChecking(true);
      const requestId = activeLookupRef.current + 1;
      activeLookupRef.current = requestId;

      try {
        const response = await provider.getList("pincodes", {
          pagination: { page: 1, perPage: 100 },
          sort: { field: "updated_on", order: "DESC" },
          filter: { q: clean },
        });
        if (activeLookupRef.current !== requestId) return;

        const exactMatches = (response?.data || []).filter(
          (item) => String(item?.pincode || "").trim() === clean
        );
        if (!exactMatches.length) {
          setLookupMessage({
            isValid: false,
            serviceAvailable: false,
            invalidText: "Invalid pincode",
            serviceText: "",
          });
          return;
        }

        const activeMatches = exactMatches.filter(
          (item) => item?.is_active !== false
        );
        const serviceMatches = activeMatches.filter(
          (item) => item?.embargo !== true
        );
        const preferred =
          serviceMatches[0] || activeMatches[0] || exactMatches[0];

        setValue(
          "area_sector",
          String(
            preferred?.taluk ||
              preferred?.office_name ||
              preferred?.division_name ||
              ""
          ).trim(),
          { shouldDirty: true, shouldValidate: true }
        );
        setValue(
          "town_city",
          String(preferred?.district_name || "").trim(),
          { shouldDirty: true, shouldValidate: true }
        );
        setValue(
          "state_region",
          String(
            preferred?.state_name || preferred?.state_short_name || ""
          ).trim(),
          { shouldDirty: true, shouldValidate: true }
        );

        setLookupMessage({
          isValid: true,
          serviceAvailable: serviceMatches.length > 0,
          invalidText: "",
          serviceText:
            serviceMatches.length > 0
              ? "Service is available"
              : "Service is not available",
        });
      } catch {
        if (activeLookupRef.current !== requestId) return;
        setLookupMessage({
          isValid: false,
          serviceAvailable: false,
          invalidText: "Invalid pincode",
          serviceText: "",
        });
      } finally {
        if (activeLookupRef.current === requestId) {
          setIsChecking(false);
        }
      }
    },
    [field, provider, setValue]
  );

  return (
    <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
      <TextField
        label="Pincode"
        variant="outlined"
        fullWidth
        value={field.value ?? ""}
        onChange={(event) => {
          const clean = normalizePincode(event.target.value);
          field.onChange(clean);
          setLookupMessage(null);
          lastLookupRef.current = "";
        }}
        onBlur={async (event) => {
          field.onBlur();
          await handleLookup(event.target.value);
        }}
        error={Boolean(fieldState.error)}
        helperText={fieldState.error?.message}
        inputProps={{ inputMode: "numeric", maxLength: 6 }}
      />
      {isChecking ? (
        <Typography sx={{ mt: 0.75, fontSize: 12, color: "#4b5563" }}>
          Checking pincode...
        </Typography>
      ) : null}
      {lookupMessage ? (
        <Box sx={{ mt: 0.75 }}>
          {!lookupMessage.isValid && lookupMessage.invalidText ? (
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: "error.main",
              }}
            >
              {lookupMessage.invalidText}
            </Typography>
          ) : null}
          {lookupMessage.isValid && lookupMessage.serviceText ? (
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: lookupMessage.serviceAvailable
                  ? "success.main"
                  : "error.main",
              }}
            >
              {lookupMessage.serviceText}
            </Typography>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
};

const HelpfulInfoAside = ({
  mt = { xs: 1, lg: 0 },
  desktopWidth = 308,
  children,
}) => {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("md"));
  const [open, setOpen] = React.useState(false);
  const hasContent = Boolean(children);

  if (isMobile) {
    return (
      <>
        <Box
          sx={{
            position: "fixed",
            right: 112,
            bottom: 15,
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Button
            size="small"
            variant="contained"
            onClick={() => setOpen(true)}
            sx={{
              minHeight: 38,
              borderRadius: 999,
              px: 1.5,
              whiteSpace: "nowrap",
              boxShadow: 3,
              backgroundColor: "#0A4A47",
              "&:hover": { backgroundColor: "#083B39" },
            }}
          >
            Read this first
          </Button>
        </Box>
        <Drawer
          anchor="bottom"
          open={open}
          onClose={() => setOpen(false)}
          PaperProps={{
            sx: {
              height: "100dvh",
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            },
          }}
        >
          <Box
            sx={{
              p: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography
                component="h2"
                sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}
              >
                Helpful info
              </Typography>
                <IconButton
                  aria-label="close helpful info"
                  onClick={() => setOpen(false)}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            {hasContent ? (
              <Box sx={{ mt: 2, flex: 1, overflowY: "auto", pr: 0.5 }}>
                {children}
              </Box>
            ) : (
              <Box sx={{ flex: 1 }} />
            )}
          </Box>
        </Drawer>
      </>
    );
  }

  return (
    <Card
      sx={{
        width: { xs: "100%", lg: desktopWidth },
        alignSelf: "flex-start",
        ml: { xs: 0, lg: 2 },
        mt,
      }}
    >
      <CardContent>
        <Typography
          component="h2"
          sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}
        >
          Helpful info
        </Typography>
        {hasContent ? <Box sx={{ mt: 1.5 }}>{children}</Box> : null}
      </CardContent>
    </Card>
  );
};

const AddressHelpfulInfoAside = () => (
  <HelpfulInfoAside>
    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0A4A47" }}>
      Address Tips
    </Typography>
    <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2, color: "#374151", fontSize: 13 }}>
      <li>Use a clear address name like Home, Office, or Warehouse.</li>
      <li>Keep pincode, city, and state correct to avoid pickup issues.</li>
      <li>Set defaults so shipping and billing are auto-selected.</li>
    </Box>
  </HelpfulInfoAside>
);

const InventoryHelpfulInfoAside = () => {
  const [imageOpen, setImageOpen] = React.useState(false);

  return (
    <HelpfulInfoAside desktopWidth={360}>
      <Box sx={{ mb: 1.5 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1f2937", mb: 0.75 }}>
        ISBN example
      </Typography>
      <Box
        component="img"
        src={bookBacksideIsbnNumber}
        alt="Example of ISBN number on the back side of a book"
        onClick={() => setImageOpen(true)}
        sx={{
          width: 100,
          maxWidth: "100%",
          height: "auto",
          borderRadius: 1,
          border: "1px solid #e5e7eb",
          cursor: "zoom-in",
        }}
      />
      <Typography sx={{ mt: 0.75, fontSize: 12, color: "#4b5563" }}>
        You can find the ISBN on the back cover of the book, usually near the
        bottom. It may appear as either a 10-digit or 13-digit number-either
        format can be used to identify the book.
      </Typography>
    </Box>
    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0A4A47" }}>
      Inventory Tips
    </Typography>
    <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2, color: "#374151", fontSize: 13 }}>
      <li>Use clear titles and correct category for faster discovery.</li>
      <li>Add ISBN whenever available to improve search accuracy.</li>
      <li>Keep price and quantity updated before creating pickup requests.</li>
    </Box>
      <Dialog
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: "40vw",
            maxWidth: 420,
          },
        }}
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            aria-label="close image preview"
            onClick={() => setImageOpen(false)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1,
              backgroundColor: "rgba(255,255,255,0.9)",
              "&:hover": { backgroundColor: "#fff" },
            }}
          >
            <CloseIcon />
          </IconButton>
          <DialogContent sx={{ p: 2 }}>
            <Box
              component="img"
              src={bookBacksideIsbnNumber}
              alt="Example of ISBN number on the back side of a book"
              sx={{
                width: "100%",
                maxHeight: "40vh",
                height: "auto",
                display: "block",
                borderRadius: 1,
                objectFit: "contain",
              }}
            />
          </DialogContent>
        </Box>
      </Dialog>
    </HelpfulInfoAside>
  );
};

const PackageHelpfulInfoAside = () => {
  const [imageOpen, setImageOpen] = React.useState(false);

  return (
    <HelpfulInfoAside>
      <Box
        component="img"
        src={cardBoardBox}
        alt="Cardboard box"
        onClick={() => setImageOpen(true)}
        sx={{
          width: 100,
          height: 100,
          objectFit: "contain",
          cursor: "zoom-in",
        }}
      />
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0A4A47" }}>
        Quick Packaging Guide
      </Typography>
      <Typography sx={{ mt: 0.75, fontSize: 13, color: "#374151" }}>
        To protect your items (especially books) from damage, please follow these requirements:
      </Typography>

      <Typography sx={{ mt: 1.5, fontSize: 13, fontWeight: 700, color: "#1f2937" }}>
        1. Use the Right Container
      </Typography>
      <Box component="ul" sx={{ mt: 0.75, mb: 0, pl: 2, color: "#374151", fontSize: 13 }}>
        <li>
          <strong>DO:</strong> Use sturdy, rigid corrugated cardboard boxes.
        </li>
        <li>
          <strong>DO NOT USE:</strong> Plastic or gummy bags, paper bags, or cloth bags.
        </li>
      </Box>

      <Typography sx={{ mt: 1.5, fontSize: 13, fontWeight: 700, color: "#1f2937" }}>
        2. Secure Sealing
      </Typography>
      <Typography sx={{ mt: 0.75, fontSize: 13, color: "#374151" }}>
        <strong>The H-Tape Method:</strong> Apply heavy-duty tape along all open seams and corners to form an
        &quot;H&quot; shape for a reinforced, moisture-resistant seal.
      </Typography>

      <Typography sx={{ mt: 1.5, fontSize: 13, fontWeight: 700, color: "#1f2937" }}>
        3. Internal Protection
      </Typography>
      <Box component="ul" sx={{ mt: 0.75, mb: 0, pl: 2, color: "#374151", fontSize: 13 }}>
        <li>
          <strong>No gaps:</strong> Fill empty spaces with bubble wrap or paper to prevent movement.
        </li>
        <li>
          <strong>Weight limit:</strong> Do not overstuff. Box should close flat without bulging.
        </li>
      </Box>

      <Typography sx={{ mt: 1.5, fontSize: 13, fontWeight: 700, color: "#1f2937" }}>
        4. Label Placement
      </Typography>
      <Typography sx={{ mt: 0.75, fontSize: 13, color: "#374151" }}>
        Affix the shipping label securely to the side of the box, never on top or on a seam.
      </Typography>

      <Typography sx={{ mt: 1.5, fontSize: 13, fontWeight: 700, color: "#1f2937" }}>
        Quick Checklist
      </Typography>
      <Stack spacing={0.5} sx={{ mt: 0.75 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Checkbox size="small" disabled checked={false} sx={{ p: 0.5 }} />
          <Typography sx={{ fontSize: 13, color: "#374151" }}>Rigid cardboard box?</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Checkbox size="small" disabled checked={false} sx={{ p: 0.5 }} />
          <Typography sx={{ fontSize: 13, color: "#374151" }}>Sealed with H-tape method?</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Checkbox size="small" disabled checked={false} sx={{ p: 0.5 }} />
          <Typography sx={{ fontSize: 13, color: "#374151" }}>Label on the side?</Typography>
        </Box>
      </Stack>
      <Dialog
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: "40vw",
            maxWidth: 420,
          },
        }}
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            aria-label="close package image preview"
            onClick={() => setImageOpen(false)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1,
              backgroundColor: "rgba(255,255,255,0.9)",
              "&:hover": { backgroundColor: "#fff" },
            }}
          >
            <CloseIcon />
          </IconButton>
          <DialogContent sx={{ p: 2 }}>
            <Box
              component="img"
              src={cardBoardBox}
              alt="Cardboard box"
              sx={{
                width: "100%",
                maxHeight: "40vh",
                height: "auto",
                display: "block",
                borderRadius: 1,
                objectFit: "contain",
              }}
            />
          </DialogContent>
        </Box>
      </Dialog>
    </HelpfulInfoAside>
  );
};

const PickupRequestHelpfulInfoAside = () => (
  <HelpfulInfoAside>
    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0A4A47" }}>
      Pickup Request Status Guide
    </Typography>

    <Typography sx={{ mt: 1.5, fontSize: 13, fontWeight: 700, color: "#1f2937" }}>
      1. Status Definitions
    </Typography>
    <Box component="ul" sx={{ mt: 0.75, mb: 0, pl: 2, color: "#374151", fontSize: 13 }}>
      <li>
        <strong>Draft:</strong> Use this while finalizing packages, quantities, or pickup date.
      </li>
      <li>
        <strong>Booked:</strong> Use after packages are finalized and shipping date is set.
      </li>
      <li>
        <strong>Ready for Pickup:</strong> Use only after labels and package preparation are complete.
      </li>
    </Box>

    <Typography sx={{ mt: 1.5, fontSize: 13, fontWeight: 700, color: "#1f2937" }}>
      2. Shipping Labels and Packaging
    </Typography>
    <Box component="ul" sx={{ mt: 0.75, mb: 0, pl: 2, color: "#374151", fontSize: 13 }}>
      <li>
        <strong>Label placement:</strong> Paste labels on the side of the package, not on the top.
      </li>
      <li>
        <strong>Download access:</strong> Label downloads are available only for <strong>Booked</strong> or{" "}
        <strong>Ready for Pickup</strong>.
      </li>
      <li>
        <strong>How to download:</strong> Open your pickup request in <strong>Show</strong> and use the label
        download buttons.
      </li>
    </Box>

    <Typography sx={{ mt: 1.5, fontSize: 13, fontWeight: 700, color: "#1f2937" }}>
      3. Pickup Confirmation
    </Typography>
    <Box component="ul" sx={{ mt: 0.75, mb: 0, pl: 2, color: "#374151", fontSize: 13 }}>
      <li>
        <strong>Phone verification:</strong> Expect a confirmation call one business day before scheduled pickup.
      </li>
      <li>
        <strong>Final step:</strong> Set status to <strong>Ready for Pickup</strong> to help finalize logistics.
      </li>
    </Box>
  </HelpfulInfoAside>
);

const DashboardHelpfulInfoAside = () => (
  <HelpfulInfoAside mt={{ xs: 1, lg: 3 }} />
);

const EditProfileHelpfulInfoAside = () => (
  <HelpfulInfoAside mt={{ xs: 1, lg: 3 }}>
    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0A4A47" }}>
      Profile Help
    </Typography>
    <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2, color: "#374151", fontSize: 13 }}>
      <li>Update your profile details anytime.</li>
      <li>Plan is locked after first selection.</li>
    </Box>
  </HelpfulInfoAside>
);

const joinAddressParts = (...values) =>
  values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");

const AddressCard = ({ address }) => (
  <Card
    sx={{
      border: "1px solid #e5e7eb",
      borderRadius: 2,
      minWidth: 0,
      height: "100%",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.75, pb: 1 }}>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827", lineHeight: 1.25 }}>
        {address.address_name || "Address"}
      </Typography>
      <Typography sx={{ fontSize: 14, color: "#374151" }}>
        {joinAddressParts(address.full_name, address.mobile_num)}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 14, color: "#111827" }}>
        {joinAddressParts(address.building_name, address.company_name)}
      </Typography>
      <Typography sx={{ fontSize: 14, color: "#111827" }}>
        {joinAddressParts(address.area_sector, address.town_city)}
      </Typography>
      {address.locality ? (
        <Typography sx={{ fontSize: 14, color: "#374151" }}>
          Locality: {address.locality}
        </Typography>
      ) : null}
      {address.landmark ? (
        <Typography sx={{ fontSize: 14, color: "#374151" }}>
          Landmark: {address.landmark}
        </Typography>
      ) : null}
      <Typography sx={{ fontSize: 14, color: "#111827" }}>
        {joinAddressParts(address.state_region, address.pincode)}
      </Typography>
      <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        <Box
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            color: "#0A4A47",
            backgroundColor: "#E8F5F4",
          }}
        >
          {address.address_type === "OFFICE" ? "Office" : "Residence"}
        </Box>
        {address.default_shipping_address ? (
          <Box
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              color: "#155E75",
              backgroundColor: "#E0F2FE",
            }}
          >
            Default Shipping
          </Box>
        ) : null}
        {address.default_billing_address ? (
          <Box
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              color: "#713F12",
              backgroundColor: "#FEF3C7",
            }}
          >
            Default Billing
          </Box>
        ) : null}
      </Box>
    </CardContent>
    <CardActions sx={{ justifyContent: "flex-end", px: 2, pb: 1.5, pt: 0, mt: "auto" }}>
      <ShowButton resource="my/address" record={address} />
      <EditButton resource="my/address" record={address} />
      <DeleteButton
        resource="my/address"
        record={address}
        mutationMode="pessimistic"
      />
    </CardActions>
  </Card>
);

const AddressList = () => {
  const {
    data = [],
    isLoading,
    error,
  } = useGetList("my/address", {
    filter: {},
    pagination: { page: 1, perPage: 25 },
    sort: { field: "created_on", order: "DESC" },
  });

  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" } }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AddressResourceIntro />

        <AddressListActions />

        {isLoading ? (
          <Typography sx={{ mt: 2, color: "#4b5563" }}>Loading...</Typography>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            Unable to load addresses.
          </Alert>
        ) : null}

        {!isLoading && !error ? (
          data.length ? (
            <Box
              sx={{
                mt: 1.5,
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                  xl: "repeat(3, minmax(0, 1fr))",
                },
              }}
            >
              {data.map((address) => (
                <AddressCard key={address.id} address={address} />
              ))}
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              No shipping address / pickup address found. Please add your
              address.
            </Alert>
          )
        ) : null}
      </Box>
      <AddressHelpfulInfoAside />
    </Box>
  );
};

const AddressFormFields = ({ isEdit = false }) => (
  <Stack spacing={2} sx={{ width: "100%" }}>
    <Card variant="outlined" sx={{ width: "100%", alignSelf: "stretch" }}>
      <CardContent>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>
          Contact and Type
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          }}
        >
          <TextInput
            source="address_name"
            label="Address Name (Home / Office / Warehouse)"
            variant="outlined"
            placeholder="Label for your address eg: my address, my new address, my uncle address"
            fullWidth
          />
          <SelectInput
            source="address_type"
            choices={ADDRESS_TYPE_CHOICES}
            variant="outlined"
            fullWidth
          />
        </Box>
      </CardContent>
    </Card>

    <Card variant="outlined" sx={{ width: "100%", alignSelf: "stretch" }}>
      <CardContent>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>
          Address Details
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          }}
        >
          <TextInput
            source="full_name"
            label="Contact Person Name"
            variant="outlined"
            fullWidth
          />
          <TextInput
            source="mobile_num"
            label="Contact Mobile"
            variant="outlined"
            fullWidth
          />
          <TextInput
            source="building_name"
            label="Flat / House No / Apartment"
            variant="outlined"
            fullWidth
          />
          <TextInput
            source="company_name"
            label="Company Name (Optional)"
            variant="outlined"
            fullWidth
          />
          <AddressPincodeInput />
          <TextInput
            source="area_sector"
            label="Area / Colony / Street / Sector / Village"
            variant="outlined"
            fullWidth
          />
          <TextInput
            source="locality"
            label="Locality"
            variant="outlined"
            fullWidth
          />
          <TextInput
            source="landmark"
            label="Landmark (Optional)"
            variant="outlined"
            fullWidth
          />
          <TextInput
            source="town_city"
            label="Town / City"
            variant="outlined"
            fullWidth
          />
          <TextInput
            source="state_region"
            label="State / Region"
            variant="outlined"
            fullWidth
          />
        </Box>
      </CardContent>
    </Card>

    <Card variant="outlined" sx={{ width: "100%", alignSelf: "stretch" }}>
      <CardContent>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>
          Defaults
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          }}
        >
          <BooleanInput source="default_shipping_address" />
          <BooleanInput source="default_billing_address" />
          {isEdit ? <BooleanInput source="is_active" /> : null}
        </Box>
      </CardContent>
    </Card>
  </Stack>
);

const AddressCreate = () => (
  <Create aside={<AddressHelpfulInfoAside />}>
    <SimpleForm sx={{ maxWidth: "none", width: "100%" }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>
        Create Address
      </Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
        Add a pickup and delivery address with contact details.
      </Typography>
      <AddressFormFields />
    </SimpleForm>
  </Create>
);

const AddressEdit = () => (
  <Edit aside={<AddressHelpfulInfoAside />}>
    <SimpleForm sx={{ maxWidth: "none", width: "100%" }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>
        Edit Address
      </Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
        Update contact details and default settings for this address.
      </Typography>
      <AddressFormFields isEdit />
    </SimpleForm>
  </Edit>
);

const formatDateTime = (value) => {
  if (!value) return "-";
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return String(value);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const weekday = weekdays[dateValue.getDay()];
  const day = String(dateValue.getDate()).padStart(2, "0");
  const month = months[dateValue.getMonth()];
  const year = dateValue.getFullYear();
  const hour = String(dateValue.getHours()).padStart(2, "0");
  const minute = String(dateValue.getMinutes()).padStart(2, "0");
  const meridiem = dateValue.getHours() >= 12 ? "PM" : "AM";
  return `${weekday} ${day} ${month} ${year} ${hour}:${minute} ${meridiem}`;
};

const getUserInitials = (name, fallback) => {
  const base = String(name || fallback || "").trim();
  if (!base) return "U";
  const normalized = base.includes("@") ? base.split("@")[0] : base;
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const formatFileSize = (bytesValue) => {
  const bytes = Number(bytesValue);
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes >= 1000 * 1000 * 1000) return `${(bytes / (1000 * 1000 * 1000)).toFixed(2)} GB`;
  if (bytes >= 1000 * 1000) return `${(bytes / (1000 * 1000)).toFixed(2)} MB`;
  if (bytes >= 1000) return `${(bytes / 1000).toFixed(2)} KB`;
  return `${bytes} B`;
};

const AddressShowContent = () => {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
            {record.address_name || "Address"}
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 15, color: "#374151" }}>
            {joinAddressParts(record.full_name, record.mobile_num)}
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 15, color: "#111827" }}>
            {joinAddressParts(record.building_name, record.company_name)}
          </Typography>
          <Typography sx={{ fontSize: 15, color: "#111827" }}>
            {joinAddressParts(record.area_sector, record.town_city)}
          </Typography>
          {record.locality ? (
            <Typography sx={{ fontSize: 15, color: "#374151" }}>
              Locality: {record.locality}
            </Typography>
          ) : null}
          {record.landmark ? (
            <Typography sx={{ fontSize: 15, color: "#374151" }}>
              Landmark: {record.landmark}
            </Typography>
          ) : null}
          <Typography sx={{ fontSize: 15, color: "#111827" }}>
            {joinAddressParts(record.state_region, record.pincode)}
          </Typography>

          <Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                color: "#0A4A47",
                backgroundColor: "#E8F5F4",
              }}
            >
              {record.address_type === "OFFICE" ? "Office" : "Residence"}
            </Box>
            {record.default_shipping_address ? (
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#155E75",
                  backgroundColor: "#E0F2FE",
                }}
              >
                Default Shipping
              </Box>
            ) : null}
            {record.default_billing_address ? (
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#713F12",
                  backgroundColor: "#FEF3C7",
                }}
              >
                Default Billing
              </Box>
            ) : null}
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>
            Meta
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr" }, rowGap: 0.75 }}>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>UUID</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827", wordBreak: "break-all" }}>{record.uuid}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Active</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record.is_active ? "Yes" : "No"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Created On</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{formatDateTime(record.created_on)}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Updated On</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{formatDateTime(record.updated_on)}</Typography>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
};

const AddressShow = () => (
  <Show aside={<AddressHelpfulInfoAside />}>
    <AddressShowContent />
  </Show>
);

const adminUserListFilters = [
  <SearchInput key="admin-user-search" source="q" alwaysOn placeholder="Search name, email, username, mobile" variant="outlined" />,
  <SelectInput key="admin-user-role" source="pfs_role" label="Role" choices={USER_ROLE_CHOICES} variant="outlined" />,
  <SelectInput key="admin-user-status" source="is_active" label="Status" choices={ADMIN_USER_STATUS_CHOICES} variant="outlined" />,
  <SelectInput key="admin-user-date-range" source="created_range" label="Signups" choices={DATE_RANGE_CHOICES} variant="outlined" />,
  <DateInput key="admin-user-date-from" source="created_from" label="From" variant="outlined" />,
  <DateInput key="admin-user-date-to" source="created_to" label="To" variant="outlined" />,
];

const adminAddressListFilters = [
  <SearchInput key="admin-address-search" source="q" alwaysOn placeholder="Search name, city, pincode" variant="outlined" />,
];

const adminInventoryListFilters = [
  <SearchInput key="admin-inventory-search" source="q" alwaysOn placeholder="Search title, ISBN, author, publisher" variant="outlined" />,
  <SelectInput key="admin-inventory-date-range" source="created_range" label="Created" choices={DATE_RANGE_CHOICES} variant="outlined" />,
  <DateInput key="admin-inventory-date-from" source="created_from" label="From" variant="outlined" />,
  <DateInput key="admin-inventory-date-to" source="created_to" label="To" variant="outlined" />,
];

const adminPackageListFilters = [
  <SearchInput key="admin-package-search" source="q" alwaysOn placeholder="Search package name, AWB, category" variant="outlined" />,
];

const adminPickupListFilters = [
  <SearchInput key="admin-pickup-search" source="q" alwaysOn placeholder="Search pickup ref, status, mode" variant="outlined" />,
  <SelectInput key="admin-pickup-date-range" source="created_range" label="Created" choices={DATE_RANGE_CHOICES} variant="outlined" />,
  <DateInput key="admin-pickup-date-from" source="created_from" label="From" variant="outlined" />,
  <DateInput key="admin-pickup-date-to" source="created_to" label="To" variant="outlined" />,
  <SelectInput key="admin-pickup-scheduled-range" source="scheduled_range" label="Scheduled" choices={DATE_RANGE_CHOICES} variant="outlined" />,
  <DateInput key="admin-pickup-scheduled-from" source="scheduled_from" label="Scheduled From" variant="outlined" />,
  <DateInput key="admin-pickup-scheduled-to" source="scheduled_to" label="Scheduled To" variant="outlined" />,
];

const adminOrderListFilters = [
  <SearchInput key="admin-order-search" source="q" alwaysOn placeholder="Search order UUID" variant="outlined" />,
  <SelectInput key="admin-order-status" source="status" label="Status" choices={ORDER_STATUS_CHOICES} variant="outlined" />,
  <SelectInput key="admin-order-payment" source="payment_status" label="Payment" choices={ORDER_PAYMENT_STATUS_CHOICES} variant="outlined" />,
  <SelectInput key="admin-order-date-range" source="created_range" label="Created" choices={DATE_RANGE_CHOICES} variant="outlined" />,
  <DateInput key="admin-order-date-from" source="created_from" label="From" variant="outlined" />,
  <DateInput key="admin-order-date-to" source="created_to" label="To" variant="outlined" />,
];

const AdminUserListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton resource="admin/users" label="New user" />
  </TopToolbar>
);

const AdminUserList = () => (
  <List
    perPage={25}
    sort={{ field: "updated_on", order: "DESC" }}
    filters={adminUserListFilters}
    actions={<AdminUserListActions />}
  >
    <>
      <AdminUserResourceIntro />
      <Datagrid rowClick="show">
        <TextField label="ID" source="id" />
        <FunctionField
          label="User"
          render={(record) => {
            const imageUrl = toAbsoluteUrl(record?.profile_image_url);
            const displayName = record?.full_name || record?.username || record?.email || "Unknown";
            const subtitle = record?.email || record?.username || "-";
            const initials = getUserInitials(displayName, record?.email);
            return (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Avatar
                  src={imageUrl || undefined}
                  sx={{
                    width: 38,
                    height: 38,
                    fontSize: 13,
                    bgcolor: "#0A4A47",
                  }}
                >
                  {imageUrl ? "" : initials}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: "#111827" }}>{displayName}</Typography>
                  <Typography sx={{ fontSize: 12, color: "#6b7280" }}>{subtitle}</Typography>
                </Box>
              </Box>
            );
          }}
        />
        <FunctionField
          label="Role"
          render={(record) => {
            const role = String(record?.pfs_role || "").toUpperCase();
            const label = USER_ROLE_CHOICES.find((choice) => choice.id === role)?.name || role || "-";
            const palette = {
              ADMIN: { color: "#1D4ED8", bg: "#DBEAFE" },
              SELLER: { color: "#0F766E", bg: "#CCFBF1" },
              CUSTOMER: { color: "#4338CA", bg: "#E0E7FF" },
              GUEST: { color: "#6B7280", bg: "#F3F4F6" },
            };
            const style = palette[role] || { color: "#374151", bg: "#F3F4F6" };
            return (
              <Box
                sx={{
                  px: 1.25,
                  py: 0.4,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: style.color,
                  backgroundColor: style.bg,
                  display: "inline-flex",
                }}
              >
                {label}
              </Box>
            );
          }}
        />
        <FunctionField
          label="Plan"
          render={(record) =>
            USER_PLAN_CHOICES.find((choice) => choice.id === record?.plan)?.name || record?.plan || "-"
          }
        />
        <RaTextField source="mobile" label="Mobile" />
        <NumberField source="inventories" label="Inventories" />
        <FunctionField
          label="Status"
          render={(record) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  px: 1.1,
                  py: 0.35,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: record?.is_active ? "#065F46" : "#991B1B",
                  backgroundColor: record?.is_active ? "#ECFDF5" : "#FEE2E2",
                }}
              >
                {record?.is_active ? "Active" : "Inactive"}
              </Box>
              <Box
                sx={{
                  px: 1.1,
                  py: 0.35,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: record?.is_staff ? "#7C2D12" : "#6B7280",
                  backgroundColor: record?.is_staff ? "#FFEDD5" : "#F3F4F6",
                }}
              >
                {record?.is_staff ? "Staff" : "Standard"}
              </Box>
            </Box>
          )}
        />
        <FunctionField label="Updated On" render={(record) => formatDateTime(record?.updated_on)} />
        <FunctionField
          label="Actions"
          sortable={false}
          render={(record) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <EditButton resource="admin/users" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
              <ShowButton resource="admin/users" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
              <DeleteButton resource="admin/users" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
            </Box>
          )}
        />
      </Datagrid>
    </>
  </List>
);

const AdminUserFormFields = ({ isEdit = false }) => (
  <Box sx={{ display: "grid", gap: 2 }}>
    <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Identity</Typography>
    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
      <TextInput source="full_name" label="Full Name" fullWidth validate={required("Full name is required.")} variant="outlined" />
      <TextInput source="email" label="Email" type="email" fullWidth validate={required("Email is required.")} variant="outlined" />
      <TextInput source="username" label="Username" fullWidth validate={required("Username is required.")} variant="outlined" />
      <TextInput
        source="password"
        label={isEdit ? "Reset Password" : "Password"}
        type="password"
        fullWidth
        helperText={isEdit ? "Leave blank to keep the current password." : ""}
        validate={isEdit ? undefined : required("Password is required.")}
        variant="outlined"
      />
    </Box>

    <Divider />

    <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Access</Typography>
    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
      <SelectInput source="pfs_role" label="Role" choices={USER_ROLE_CHOICES} fullWidth variant="outlined" />
      <SelectInput source="plan" label="Plan" choices={USER_PLAN_CHOICES} fullWidth variant="outlined" />
      <BooleanInput source="is_active" label="Active" />
      <BooleanInput source="is_staff" label="Staff Access" />
      <BooleanInput source="plan_locked" label="Plan Locked" />
      <BooleanInput source="is_superuser" label="Superuser" />
    </Box>

    <Divider />

    <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Profile</Typography>
    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
      <TextInput source="mobile" label="Mobile" fullWidth variant="outlined" />
      <TextInput source="upi_id" label="UPI ID" fullWidth variant="outlined" />
      <BooleanInput source="upi_verified" label="UPI Verified" />
      <TextInput
        source="favourite_book"
        label="Favourite Book"
        fullWidth
        multiline
        minRows={2}
        sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" } }}
        variant="outlined"
      />
      <ReferenceInput source="profile_image_uuid" reference="photos" sort={{ field: "created_on", order: "DESC" }} perPage={100}>
        <AutocompleteInput
          label="Profile Image"
          fullWidth
          optionText={(choice) => (choice?.file_name ? `${choice.file_name} (${choice.id})` : choice?.id || "")}
          variant="outlined"
        />
      </ReferenceInput>
    </Box>
  </Box>
);

const AdminUserCreate = () => (
  <Create>
    <SimpleForm defaultValues={{ pfs_role: "CUSTOMER", plan: "SMART_SELL", is_active: true, is_staff: false, upi_verified: false, plan_locked: false }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Create User</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
        Add a new user with the right access level and plan.
      </Typography>
      <AdminUserFormFields />
    </SimpleForm>
  </Create>
);

const AdminUserEdit = () => (
  <Edit>
    <SimpleForm>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Edit User</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
        Update user access, plan details, and profile information.
      </Typography>
      <AdminUserFormFields isEdit />
    </SimpleForm>
  </Edit>
);

const AdminUserTabPanel = ({ value, index, children }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>
    {value === index ? children : null}
  </Box>
);

const AdminUserTabGrid = ({ columns, rows }) => (
  <Box sx={{ border: "1px solid #e5e7eb", borderRadius: 2, overflow: "hidden" }}>
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: columns.map((column) => column.width || "minmax(0, 1fr)").join(" "),
        gap: 1.5,
        px: 2,
        py: 1.25,
        backgroundColor: "#f9fafb",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      {columns.map((column) => (
        <Typography key={column.label} sx={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
          {column.label}
        </Typography>
      ))}
    </Box>
    {rows.map((row, index) => (
      <Box
        key={row?.uuid || row?.id || index}
        sx={{
          display: "grid",
          gridTemplateColumns: columns.map((column) => column.width || "minmax(0, 1fr)").join(" "),
          gap: 1.5,
          px: 2,
          py: 1.5,
          borderBottom: index === rows.length - 1 ? "none" : "1px solid #e5e7eb",
          alignItems: "center",
        }}
      >
        {columns.map((column) => (
          <Box key={column.label} sx={{ minWidth: 0 }}>
            {column.render(row)}
          </Box>
        ))}
      </Box>
    ))}
  </Box>
);

const useAdminUserTabList = (resource, isActive) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const [state, setState] = React.useState({ data: [], loading: false, error: "" });

  React.useEffect(() => {
    if (!isActive || !resource) return;
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: "" }));

    dataProvider
      .getList(resource, {
        pagination: { page: 1, perPage: 10 },
        sort: { field: "created_on", order: "DESC" },
        filter: {},
      })
      .then((response) => {
        if (cancelled) return;
        setState({ data: response.data || [], loading: false, error: "" });
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error?.message || "Unable to load data.";
        notify(message, { type: "error" });
        setState({ data: [], loading: false, error: message });
      });

    return () => {
      cancelled = true;
    };
  }, [dataProvider, isActive, notify, resource]);

  return state;
};

const AdminUserTabContent = ({ resource, columns, emptyState, isActive }) => {
  const { data, loading, error } = useAdminUserTabList(resource, isActive);

  if (!isActive) return null;
  if (loading) {
    return <Typography sx={{ color: "#6b7280" }}>Loading...</Typography>;
  }
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 1.5 }}>
        {error}
      </Alert>
    );
  }
  if (!data.length) {
    return <Typography sx={{ color: "#6b7280" }}>{emptyState}</Typography>;
  }
  return <AdminUserTabGrid columns={columns} rows={data} />;
};

const AdminUserShowContent = () => {
  const record = useRecordContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  if (!record) return null;
  const imageUrl = toAbsoluteUrl(record?.profile_image_url);
  const displayName = record?.full_name || record?.username || record?.email || "-";
  const initials = getUserInitials(displayName, record?.email);
  const [tabIndex, setTabIndex] = React.useState(0);
  const [selectedPlan, setSelectedPlan] = React.useState(record?.plan || "SMART_SELL");
  const [isSavingPlan, setIsSavingPlan] = React.useState(false);

  React.useEffect(() => {
    setSelectedPlan(record?.plan || "SMART_SELL");
  }, [record?.plan]);

  const formatCurrency = (value, currency = "INR") => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    try {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(number);
    } catch {
      return number.toFixed(2);
    }
  };

  const handlePlanSave = async () => {
    if (!record?.id || selectedPlan === record?.plan) return;
    setIsSavingPlan(true);
    try {
      await dataProvider.update("admin/users", {
        id: record.id,
        data: { plan: selectedPlan },
        previousData: record,
      });
      notify("Plan updated successfully.", { type: "success" });
      refresh();
    } catch (error) {
      notify(firstErrorMessage(error?.body, error?.message || "Unable to update plan."), {
        type: "error",
      });
      setSelectedPlan(record?.plan || "SMART_SELL");
    } finally {
      setIsSavingPlan(false);
    }
  };

  const userUuid = record?.uuid;
  const tabConfigs = [
    {
      label: "Addresses",
      resource: userUuid ? `admin/users/${userUuid}/addresses` : "",
      empty: "No addresses available for this user.",
      columns: [
        {
          label: "Address",
          width: "1.5fr",
          render: (row) => (
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#111827" }}>{row?.address_name || "Address"}</Typography>
              <Typography sx={{ fontSize: 12, color: "#6b7280" }}>
                {row?.building_name || row?.area_sector || row?.town_city || "-"}
              </Typography>
            </Box>
          ),
        },
        {
          label: "Contact",
          render: (row) => (
            <Box>
              <Typography sx={{ fontSize: 13, color: "#111827" }}>{row?.full_name || "-"}</Typography>
              <Typography sx={{ fontSize: 12, color: "#6b7280" }}>{row?.mobile_num || "-"}</Typography>
            </Box>
          ),
        },
        {
          label: "City / State",
          render: (row) => (
            <Typography sx={{ fontSize: 13, color: "#111827" }}>
              {[row?.town_city, row?.state_region, row?.pincode].filter(Boolean).join(", ") || "-"}
            </Typography>
          ),
        },
        {
          label: "Defaults",
          render: (row) => (
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              {row?.default_shipping_address ? (
                <Box sx={{ px: 1, py: 0.35, borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#065F46", backgroundColor: "#ECFDF5" }}>
                  Shipping
                </Box>
              ) : null}
              {row?.default_billing_address ? (
                <Box sx={{ px: 1, py: 0.35, borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#713F12", backgroundColor: "#FEF3C7" }}>
                  Billing
                </Box>
              ) : null}
              {!row?.default_shipping_address && !row?.default_billing_address ? (
                <Typography sx={{ fontSize: 12, color: "#6b7280" }}>Standard</Typography>
              ) : null}
            </Box>
          ),
        },
        {
          label: "Updated",
          render: (row) => <Typography sx={{ fontSize: 12, color: "#6b7280" }}>{formatDateTime(row?.updated_on)}</Typography>,
        },
      ],
    },
    {
      label: "Packages",
      resource: userUuid ? `admin/users/${userUuid}/packages` : "",
      empty: "No packages recorded for this user.",
      columns: [
        {
          label: "Package",
          width: "1.5fr",
          render: (row) => (
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#111827" }}>{row?.package_name || `Package #${row?.id}`}</Typography>
              <Typography sx={{ fontSize: 12, color: "#6b7280" }}>{row?.package_description || "-"}</Typography>
            </Box>
          ),
        },
        {
          label: "Qty / Weight",
          render: (row) => (
            <Box>
              <Typography sx={{ fontSize: 13, color: "#111827" }}>{row?.quantity ?? 0} items</Typography>
              <Typography sx={{ fontSize: 12, color: "#6b7280" }}>{row?.weight_per_package || "-"} kg</Typography>
            </Box>
          ),
        },
        {
          label: "Pickup",
          render: (row) => (
            <Typography sx={{ fontSize: 13, color: "#111827" }}>
              {row?.pickup ? `Pickup #${row.pickup}` : "Not assigned"}
            </Typography>
          ),
        },
        {
          label: "Updated",
          render: (row) => <Typography sx={{ fontSize: 12, color: "#6b7280" }}>{formatDateTime(row?.updated_on)}</Typography>,
        },
      ],
    },
    {
      label: "Pickup Requests",
      resource: userUuid ? `admin/users/${userUuid}/pickup-requests` : "",
      empty: "No pickup requests found for this user.",
      columns: [
        {
          label: "Pickup",
          width: "1.5fr",
          render: (row) => (
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#111827" }}>
                {row?.shipper_pkreqid ? `Ref ${row.shipper_pkreqid}` : `Pickup #${row?.pk ?? "-"}`}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#6b7280" }}>
                {row?.from_address_display || "Origin not set"}
              </Typography>
            </Box>
          ),
        },
        {
          label: "Schedule",
          render: (row) => (
            <Box>
              <Typography sx={{ fontSize: 13, color: "#111827" }}>
                {row?.pickup_scheduled_date ? formatDateTime(row?.pickup_scheduled_date) : "-"}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#6b7280" }}>{row?.pickup_mode || "-"}</Typography>
            </Box>
          ),
        },
        {
          label: "Status",
          render: (row) => (
            <Box sx={{ display: "inline-flex", px: 1.1, py: 0.35, borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#1D4ED8", backgroundColor: "#DBEAFE" }}>
              {row?.pickup_status || "Pending"}
            </Box>
          ),
        },
        {
          label: "Updated",
          render: (row) => <Typography sx={{ fontSize: 12, color: "#6b7280" }}>{formatDateTime(row?.updated_on)}</Typography>,
        },
      ],
    },
    {
      label: "Inventories",
      resource: userUuid ? `admin/users/${userUuid}/inventories` : "",
      empty: "No inventories available for this user.",
      columns: [
        {
          label: "Item",
          width: "1.5fr",
          render: (row) => (
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#111827" }}>{row?.name || "-"}</Typography>
              <Typography sx={{ fontSize: 12, color: "#6b7280" }}>
                {[row?.author_name, row?.publisher_name].filter(Boolean).join(" • ") || row?.product_type || "-"}
              </Typography>
            </Box>
          ),
        },
        {
          label: "Stock",
          render: (row) => (
            <Typography sx={{ fontSize: 13, color: "#111827" }}>{row?.stock_quantity ?? 0}</Typography>
          ),
        },
        {
          label: "Price",
          render: (row) => (
            <Typography sx={{ fontSize: 13, color: "#111827" }}>{formatCurrency(row?.sale_price)}</Typography>
          ),
        },
        {
          label: "Status",
          render: (row) => (
            <Box sx={{ display: "inline-flex", px: 1.1, py: 0.35, borderRadius: 999, fontSize: 11, fontWeight: 700, color: row?.is_active ? "#065F46" : "#991B1B", backgroundColor: row?.is_active ? "#ECFDF5" : "#FEE2E2" }}>
              {row?.is_active ? "Active" : "Inactive"}
            </Box>
          ),
        },
      ],
    },
    {
      label: "Orders",
      resource: userUuid ? `admin/users/${userUuid}/orders` : "",
      empty: "No orders found for this user.",
      columns: [
        {
          label: "Order",
          width: "1.5fr",
          render: (row) => (
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#111827" }}>{row?.uuid || "-"}</Typography>
              <Typography sx={{ fontSize: 12, color: "#6b7280" }}>{row?.status || "-"}</Typography>
            </Box>
          ),
        },
        {
          label: "Payment",
          render: (row) => (
            <Typography sx={{ fontSize: 13, color: "#111827" }}>{row?.payment_status || "-"}</Typography>
          ),
        },
        {
          label: "Total",
          render: (row) => (
            <Typography sx={{ fontSize: 13, color: "#111827" }}>
              {formatCurrency(row?.total_payable, row?.currency || "INR")}
            </Typography>
          ),
        },
        {
          label: "Placed",
          render: (row) => (
            <Typography sx={{ fontSize: 12, color: "#6b7280" }}>
              {formatDateTime(row?.placed_on || row?.created_on)}
            </Typography>
          ),
        },
      ],
    },
  ];

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr" }}>
      <Card variant="outlined" sx={{ height: "fit-content" }}>
        <CardContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Avatar
                src={imageUrl || undefined}
                sx={{
                  width: 72,
                  height: 72,
                  fontSize: 22,
                  bgcolor: "#0A4A47",
                  border: "1px solid #e5e7eb",
                }}
              >
                {imageUrl ? "" : initials}
              </Avatar>
              <Box>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
                  {record?.full_name || "-"}
                </Typography>
                <Typography sx={{ fontSize: 13, color: "#6b7280" }}>{record?.email || "-"}</Typography>
              </Box>
            </Box>
            <Divider />
            <Box sx={{ display: "grid", rowGap: 1 }}>
              <Box>
                <Typography sx={{ fontSize: 12, color: "#6b7280" }}>Username</Typography>
                <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.username || "-"}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12, color: "#6b7280" }}>Mobile Number</Typography>
                <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.mobile || "-"}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12, color: "#6b7280" }}>Plan</Typography>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", mt: 0.5 }}>
                  <TextField
                    select
                    size="small"
                    value={selectedPlan}
                    onChange={(event) => setSelectedPlan(event.target.value)}
                    disabled={isSavingPlan}
                    sx={{ minWidth: 180 }}
                  >
                    {USER_PLAN_CHOICES.map((choice) => (
                      <MenuItem key={choice.id} value={choice.id}>
                        {choice.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handlePlanSave}
                    disabled={isSavingPlan || selectedPlan === record?.plan}
                  >
                    Save
                  </Button>
                </Box>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 12, color: "#6b7280" }}>UPI ID</Typography>
                <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.upi_id || "-"}</Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                <Box
                  sx={{
                    px: 1.1,
                    py: 0.35,
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    color: record?.mobile_verified ? "#065F46" : "#92400E",
                    backgroundColor: record?.mobile_verified ? "#ECFDF5" : "#FEF3C7",
                  }}
                >
                  Mobile {record?.mobile_verified ? "Verified" : "Unverified"}
                </Box>
                <Box
                  sx={{
                    px: 1.1,
                    py: 0.35,
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    color: record?.upi_verified ? "#065F46" : "#92400E",
                    backgroundColor: record?.upi_verified ? "#ECFDF5" : "#FEF3C7",
                  }}
                >
                  UPI {record?.upi_verified ? "Verified" : "Unverified"}
                </Box>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Tabs
            value={tabIndex}
            onChange={(_, nextValue) => setTabIndex(nextValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 42 },
              "& .MuiTabs-indicator": { backgroundColor: "#0A4A47" },
            }}
          >
            {tabConfigs.map((tab) => (
              <Tab key={tab.label} label={tab.label} />
            ))}
          </Tabs>
          {tabConfigs.map((tab, index) => (
            <AdminUserTabPanel key={tab.label} value={tabIndex} index={index}>
              <AdminUserTabContent
                resource={tab.resource}
                columns={tab.columns}
                emptyState={tab.empty}
                isActive={tabIndex === index}
              />
            </AdminUserTabPanel>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};

const AdminUserShow = () => (
  <Show>
    <AdminUserShowContent />
  </Show>
);

const AdminAddressListActions = () => (
  <TopToolbar>
    <CreateButton resource="admin/addresses" label="New address" />
  </TopToolbar>
);

const AdminAddressList = () => (
  <List
    perPage={25}
    sort={{ field: "updated_on", order: "DESC" }}
    filters={adminAddressListFilters}
    actions={<AdminAddressListActions />}
  >
    <>
      <AdminAddressResourceIntro />
      <Datagrid rowClick="show">
        <RaTextField source="user_email" label="User" />
        <RaTextField source="address_name" label="Address Name" />
        <RaTextField source="full_name" label="Contact" />
        <RaTextField source="mobile_num" label="Mobile" />
        <RaTextField source="town_city" label="City" />
        <RaTextField source="state_region" label="State" />
        <BooleanField source="default_shipping_address" label="Ship" />
        <BooleanField source="default_billing_address" label="Bill" />
        <BooleanField source="is_active" label="Active" />
        <FunctionField label="Updated On" render={(record) => formatDateTime(record?.updated_on)} />
        <FunctionField
          label="Actions"
          sortable={false}
          render={(record) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <EditButton resource="admin/addresses" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
              <ShowButton resource="admin/addresses" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
              <DeleteButton resource="admin/addresses" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
            </Box>
          )}
        />
      </Datagrid>
    </>
  </List>
);

const AdminAddressFormFields = ({ isEdit = false }) => (
  <Box sx={{ display: "grid", gap: 2 }}>
    <Card variant="outlined">
      <CardContent>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>Assigned User</Typography>
        <ReferenceInput source="user_uuid" reference="admin/users" sort={{ field: "updated_on", order: "DESC" }} perPage={100}>
          <AutocompleteInput
            label="User"
            fullWidth
            variant="outlined"
            optionText={(choice) => (choice?.email ? `${choice.email} (${choice.uuid})` : choice?.uuid || "")}
          />
        </ReferenceInput>
      </CardContent>
    </Card>
    <AddressFormFields isEdit={isEdit} />
  </Box>
);

const AdminAddressCreate = () => (
  <Create>
    <SimpleForm defaultValues={{ is_active: true, default_shipping_address: false, default_billing_address: false }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Create Address</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
        Save a new address for any user.
      </Typography>
      <AdminAddressFormFields />
    </SimpleForm>
  </Create>
);

const AdminAddressEdit = () => (
  <Edit>
    <SimpleForm>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Edit Address</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
        Update address details and defaults.
      </Typography>
      <AdminAddressFormFields isEdit />
    </SimpleForm>
  </Edit>
);

const AdminAddressShowContent = () => {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>User</Typography>
          <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.user_email || "-"}</Typography>
          <Typography sx={{ fontSize: 12, color: "#6b7280", wordBreak: "break-all" }}>
            {record?.user_uuid || "-"}
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>Address Details</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr" }, rowGap: 0.75 }}>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Address Name</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.address_name || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Contact</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.full_name || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Mobile</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.mobile_num || "-"}</Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Location</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>
              {[record?.building_name, record?.area_sector, record?.locality, record?.town_city, record?.state_region, record?.pincode]
                .filter(Boolean)
                .join(", ") || "-"}
            </Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280" }}>Defaults</Typography>
            <Typography sx={{ fontSize: 14, color: "#111827" }}>
              {record?.default_shipping_address ? "Shipping" : "—"}
              {record?.default_billing_address ? " / Billing" : ""}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
};

const AdminAddressShow = () => (
  <Show>
    <AdminAddressShowContent />
  </Show>
);

const AdminInventoryListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton resource="admin/inventories" label="New inventory" />
  </TopToolbar>
);

const AdminInventoryList = () => (
  <List
    perPage={25}
    sort={{ field: "updated_on", order: "DESC" }}
    filters={adminInventoryListFilters}
    actions={<AdminInventoryListActions />}
  >
    <>
      <AdminInventoryResourceIntro />
      <Datagrid rowClick="show">
        <RaTextField source="seller_email" label="Seller" />
        <RaTextField source="name" label="Title" />
        <RaTextField source="isbn_13" label="ISBN-13" />
        <RaTextField source="author_name" label="Author" />
        <FunctionField label="Quality" render={(record) => getInventoryQualityLabel(record) || "-"} />
        <NumberField source="stock_quantity" label="Qty" />
        <NumberField source="sale_price" label="Sale Price" />
        <BooleanField source="is_active" label="Active" />
        <FunctionField label="Updated On" render={(record) => formatDateTime(record?.updated_on)} />
        <FunctionField
          label="Actions"
          sortable={false}
          render={(record) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <EditButton resource="admin/inventories" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
              <ShowButton resource="admin/inventories" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
              <DeleteButton resource="admin/inventories" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
            </Box>
          )}
        />
      </Datagrid>
    </>
  </List>
);

const AdminInventoryFormFields = () => (
  <Box sx={{ display: "grid", gap: 2 }}>
    <Card variant="outlined">
      <CardContent>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>Seller</Typography>
        <ReferenceInput source="seller_uuid" reference="admin/users" sort={{ field: "updated_on", order: "DESC" }} perPage={100}>
          <AutocompleteInput
            label="Seller"
            fullWidth
            variant="outlined"
            optionText={(choice) => (choice?.email ? `${choice.email} (${choice.uuid})` : choice?.uuid || "")}
          />
        </ReferenceInput>
      </CardContent>
    </Card>
    <InventoryFormFields showImagesTab qualityStartsNewRow />
  </Box>
);

const AdminInventoryEdit = () => (
  <Edit aside={<InventoryHelpfulInfoAside />}>
    <SimpleForm transform={inventoryFormTransform} sx={{ maxWidth: "none", width: "100%" }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Edit Inventory</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
        Update inventory details for this seller.
      </Typography>
      <AdminInventoryFormFields />
    </SimpleForm>
  </Edit>
);

const AdminInventoryShowContent = () => {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>Seller</Typography>
          <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.seller_email || "-"}</Typography>
          <Typography sx={{ fontSize: 12, color: "#6b7280", wordBreak: "break-all" }}>
            {record?.seller_uuid || "-"}
          </Typography>
        </CardContent>
      </Card>
      <InventoryShowContent />
    </Stack>
  );
};

const AdminInventoryShow = () => (
  <Show>
    <AdminInventoryShowContent />
  </Show>
);

const AdminPackageListActions = () => (
  <TopToolbar>
    <CreateButton resource="admin/packages" label="New package" />
  </TopToolbar>
);

const AdminPackageList = () => (
  <List
    perPage={25}
    sort={{ field: "updated_on", order: "DESC" }}
    filters={adminPackageListFilters}
    actions={<AdminPackageListActions />}
  >
    <>
      <AdminPackageResourceIntro />
      <Datagrid rowClick="show">
        <RaTextField source="owner_email" label="Owner" />
        <RaTextField source="package_name" label="Package" />
        <RaTextField source="package_category" label="Category" />
        <RaTextField source="awb_number" label="AWB" />
        <NumberField source="quantity" label="Qty" />
        <NumberField source="weight_per_package" label="Weight" />
        <FunctionField label="Updated On" render={(record) => formatDateTime(record?.updated_on)} />
        <FunctionField
          label="Actions"
          sortable={false}
          render={(record) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <EditButton resource="admin/packages" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
              <ShowButton resource="admin/packages" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
              <DeleteButton resource="admin/packages" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
            </Box>
          )}
        />
      </Datagrid>
    </>
  </List>
);

const AdminPackageFormFields = () => (
  <Box sx={{ display: "grid", gap: 2 }}>
    <Card variant="outlined">
      <CardContent>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>Owner</Typography>
        <ReferenceInput source="owner_uuid" reference="admin/users" sort={{ field: "updated_on", order: "DESC" }} perPage={100}>
          <AutocompleteInput
            label="Owner"
            fullWidth
            variant="outlined"
            optionText={(choice) => (choice?.email ? `${choice.email} (${choice.uuid})` : choice?.uuid || "")}
          />
        </ReferenceInput>
      </CardContent>
    </Card>
    <Card variant="outlined">
      <CardContent>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>Package Details</Typography>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
          <TextInput source="package_name" label="Package Name" variant="outlined" fullWidth />
          <TextInput source="package_category" label="Category" variant="outlined" fullWidth />
          <TextInput source="awb_number" label="AWB Number" variant="outlined" fullWidth />
          <TextInput source="hsn_code" label="HSN Code" variant="outlined" fullWidth />
          <NumberInput source="quantity" label="Quantity" variant="outlined" fullWidth />
          <NumberInput source="weight_per_package" label="Weight (kg)" variant="outlined" fullWidth />
          <NumberInput source="package_dimension_length" label="Length" variant="outlined" fullWidth />
          <NumberInput source="package_dimension_breadth" label="Breadth" variant="outlined" fullWidth />
          <NumberInput source="package_dimension_height" label="Height" variant="outlined" fullWidth />
        </Box>
        <TextInput source="package_description" label="Description" variant="outlined" fullWidth multiline minRows={2} sx={{ mt: 1.5 }} />
        <ReferenceInput source="pickup_uuid" reference="admin/pickup-requests" sort={{ field: "updated_on", order: "DESC" }} perPage={100}>
          <AutocompleteInput
            label="Pickup Request"
            fullWidth
            variant="outlined"
            optionText={(choice) => (choice?.shipper_pkreqid ? `Ref ${choice.shipper_pkreqid}` : choice?.uuid || "")}
          />
        </ReferenceInput>
      </CardContent>
    </Card>
  </Box>
);

const AdminPackageCreate = () => (
  <Create>
    <SimpleForm defaultValues={{ quantity: 1 }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Create Package</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>Add a package for any owner.</Typography>
      <AdminPackageFormFields />
    </SimpleForm>
  </Create>
);

const AdminPackageEdit = () => (
  <Edit>
    <SimpleForm>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Edit Package</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>Update package details and assignment.</Typography>
      <AdminPackageFormFields />
    </SimpleForm>
  </Edit>
);

const AdminPackageShowContent = () => {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>Owner</Typography>
          <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.owner_email || "-"}</Typography>
          <Typography sx={{ fontSize: 12, color: "#6b7280", wordBreak: "break-all" }}>
            {record?.owner_uuid || "-"}
          </Typography>
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>Package</Typography>
          <Typography sx={{ fontSize: 14, color: "#111827" }}>{record?.package_name || "-"}</Typography>
          <Typography sx={{ fontSize: 12, color: "#6b7280" }}>{record?.package_description || "-"}</Typography>
          <Typography sx={{ mt: 1, fontSize: 14, color: "#111827" }}>AWB: {record?.awb_number || "-"}</Typography>
          <Typography sx={{ fontSize: 14, color: "#111827" }}>Category: {record?.package_category || "-"}</Typography>
          <Typography sx={{ fontSize: 14, color: "#111827" }}>Qty: {record?.quantity ?? 0}</Typography>
        </CardContent>
      </Card>
    </Stack>
  );
};

const AdminPackageShow = () => (
  <Show>
    <AdminPackageShowContent />
  </Show>
);

const AdminPickupListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton resource="admin/pickup-requests" label="New pickup" />
  </TopToolbar>
);

const AdminPickupListCards = () => {
  const { data = [], isLoading } = useListContext();

  if (isLoading) {
    return (
      <Typography sx={{ mt: 1.5, color: "#4b5563" }}>
        Loading pickup requests...
      </Typography>
    );
  }

  if (!data.length) {
    return (
      <Typography sx={{ mt: 1.5, color: "#4b5563" }}>
        No pickup requests found.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {data.map((record) => (
        <Card key={record.id} sx={{ border: "1px solid #e5e7eb" }}>
          <CardContent sx={{ pb: 1 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>
              Pickup Request
            </Typography>
            <Typography sx={{ mt: 0.25, fontSize: 13, color: "#6b7280" }}>
              ID: {record.pk ?? "-"}
            </Typography>
            <Typography sx={{ mt: 1, fontSize: 13, color: "#4b5563" }}>
              <strong>From User:</strong> {record.from_user_email || "-"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>From Address:</strong> {record.from_address_display || "-"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>From Pincode:</strong>{" "}
              {record?.from_address?.pincode ||
                record?.from_pincode ||
                record?.from_address_pincode ||
                parsePincodeFromAddress(record?.from_address_display) ||
                "-"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>To:</strong> {record.to_address_display || "-"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>Scheduled:</strong> {record.pickup_scheduled_date || "-"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>Packages:</strong> {record.no_of_packages ?? 0}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>Total Weight:</strong> {record.total_weight ?? "-"} Kg
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>Status:</strong> {record.pickup_status || "-"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>Created On:</strong> {record.created_on ? formatDateTime(record.created_on) : "-"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>Updated On:</strong> {record.updated_on ? formatDateTime(record.updated_on) : "-"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>Pickup Instruction:</strong> {record.pickup_instruction || "-"}
            </Typography>
            {record.reason_for_cancellation ? (
              <Typography sx={{ mt: 0.5, fontSize: 13, color: "#7f1d1d" }}>
                <strong>Reason for Cancellation:</strong> {record.reason_for_cancellation}
              </Typography>
            ) : null}
          </CardContent>
          <CardActions sx={{ justifyContent: "flex-end", px: 2, pb: 1.5, pt: 0 }}>
            <ShowButton resource="admin/pickup-requests" record={record} label={false} />
            <EditButton resource="admin/pickup-requests" record={record} label={false} />
            <DeleteButton
              resource="admin/pickup-requests"
              record={record}
              mutationMode="pessimistic"
              label={false}
            />
          </CardActions>
        </Card>
      ))}
    </Box>
  );
};

const AdminPickupList = () => {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("md"));

  return (
    <List
      perPage={25}
      sort={{ field: "updated_on", order: "DESC" }}
      filters={adminPickupListFilters}
      actions={<AdminPickupListActions />}
    >
      <>
        <AdminPickupResourceIntro />
        {isMobile ? (
          <AdminPickupListCards />
        ) : (
          <Datagrid rowClick="show">
            <NumberField source="pk" label="ID" />
            <RaTextField source="from_user_email" label="From User" />
            <RaTextField source="from_address_display" label="From Address" />
            <FunctionField
              label="From Pincode"
              render={(record) =>
                record?.from_address?.pincode ||
                record?.from_pincode ||
                record?.from_address_pincode ||
                parsePincodeFromAddress(record?.from_address_display) ||
                "-"
              }
            />
            <FunctionField label="Scheduled" render={(record) => formatDateTime(record?.pickup_scheduled_date)} />
            <FunctionField label="Created On" render={(record) => formatDateTime(record?.created_on)} />
            <FunctionField label="Updated On" render={(record) => formatDateTime(record?.updated_on)} />
            <FunctionField
              label="Actions"
              sortable={false}
              render={(record) => (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                  <EditButton resource="admin/pickup-requests" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
                  <ShowButton resource="admin/pickup-requests" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
                  <DeleteButton resource="admin/pickup-requests" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
                </Box>
              )}
            />
          </Datagrid>
        )}
      </>
    </List>
  );
};

const AdminOrderList = () => (
  <List
    filters={adminOrderListFilters}
    sort={{ field: "created_on", order: "DESC" }}
    perPage={25}
  >
    <Datagrid rowClick="show">
      <RaTextField source="uuid" label="Order ID" />
      <RaTextField source="placed_by" label="Placed By" />
      <RaTextField source="seller_names" label="Seller" />
      <RaTextField source="seller_addresses" label="Seller Address" />
      <RaTextField source="delivery_address" label="Delivery Address" />
      <FunctionField
        label="Status"
        render={(record) => {
          const value = record?.status || "-";
          const palette = {
            DRAFT: { color: "#334155", bg: "#E2E8F0" },
            PENDING_PAYMENT: { color: "#92400E", bg: "#FDE68A" },
            PAID: { color: "#166534", bg: "#BBF7D0" },
            PAYMENT_FAILED: { color: "#991B1B", bg: "#FECACA" },
            CANCELLED: { color: "#991B1B", bg: "#FEE2E2" },
            FULFILLED: { color: "#075985", bg: "#BAE6FD" },
            REFUNDED: { color: "#3730A3", bg: "#C7D2FE" },
          };
          const style = palette[value] || { color: "#374151", bg: "#E5E7EB" };
          return (
            <Box
              sx={{
                display: "inline-flex",
                px: 1.1,
                py: 0.35,
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                color: style.color,
                backgroundColor: style.bg,
              }}
            >
              {value}
            </Box>
          );
        }}
      />
      <RaTextField source="payment_status" label="Payment" />
      <NumberField source="total_payable" label="Total" />
      <DateField source="placed_on" label="Placed" showTime />
      <ShowButton label={false} />
    </Datagrid>
  </List>
);

const AdminOrderShow = () => (
  <Show>
    <SimpleShowLayout>
      <Stack spacing={2}>
        <Card variant="outlined">
          <CardContent>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827", mb: 1.5 }}>
              Order Summary
            </Typography>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
              <FunctionField
                label="Order ID"
                render={(record) => `Order ID : ${record?.uuid || "-"}`}
              />
              <FunctionField
                label="Status"
                render={(record) => `Status : ${record?.status || "-"}`}
              />
              <FunctionField
                label="Payment Status"
                render={(record) => `Payment : ${record?.payment_status || "-"}`}
              />
              <FunctionField
                label="Currency"
                render={(record) => `Currency : ${record?.currency || "-"}`}
              />
              <FunctionField
                label="Placed On"
                render={(record) =>
                  `Placed On : ${record?.placed_on ? formatDateTime(record.placed_on) : "-"}`
                }
              />
              <FunctionField
                label="Created On"
                render={(record) =>
                  `Created On : ${record?.created_on ? formatDateTime(record.created_on) : "-"}`
                }
              />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
              <FunctionField
                label="Subtotal"
                render={(record) => `Subtotal : ${record?.subtotal ?? "-"}`
                }
              />
              <FunctionField
                label="Shipping"
                render={(record) => `Shipping : ${record?.shipping_charge ?? "-"}`
                }
              />
              <FunctionField
                label="Tax"
                render={(record) => `Tax : ${record?.tax_amount ?? "-"}`
                }
              />
              <FunctionField
                label="Discount"
                render={(record) => `Discount : ${record?.discount_amount ?? "-"}`
                }
              />
              <FunctionField
                label="Total"
                render={(record) => `Total : ${record?.total_payable ?? "-"}`
                }
              />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "grid", gap: 1 }}>
              <FunctionField
                label="Order Placed By"
                render={(record) => `Order Placed By : ${record?.placed_by || "-"}`}
              />
              <FunctionField
                label="Delivery Address"
                render={(record) => `Delivery Address : ${record?.delivery_address || "-"}`}
              />
              <FunctionField
                label="Seller"
                render={(record) => `Seller : ${record?.seller_names || "-"}`}
              />
              <FunctionField
                label="Seller Address"
                render={(record) => `Seller Address : ${record?.seller_addresses || "-"}`}
              />
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827", mb: 1.5 }}>
              Order Items
            </Typography>
            <ArrayField source="items" label={false}>
              <Datagrid bulkActionButtons={false}>
                <ImageField source="product_image_url" label="Image" />
                <RaTextField source="product_name" label="Product" />
                <RaTextField source="sku" label="SKU" />
                <NumberField source="quantity" label="Qty" />
                <NumberField source="unit_price" label="Rate" />
                <NumberField source="line_total" label="Amount" />
              </Datagrid>
            </ArrayField>
          </CardContent>
        </Card>
      </Stack>
    </SimpleShowLayout>
  </Show>
);

const AdminPickupFormFields = () => (
  <Box sx={{ display: "grid", gap: 2 }}>
    <Card variant="outlined">
      <CardContent>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>Users</Typography>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
          <ReferenceInput source="owner_uuid" reference="admin/users" sort={{ field: "updated_on", order: "DESC" }} perPage={100}>
            <AutocompleteInput
              label="Owner"
              fullWidth
              variant="outlined"
              optionText={(choice) => (choice?.email ? `${choice.email} (${choice.uuid})` : choice?.uuid || "")}
            />
          </ReferenceInput>
          <ReferenceInput source="from_user_uuid" reference="admin/users" sort={{ field: "updated_on", order: "DESC" }} perPage={100}>
            <AutocompleteInput
              label="From User"
              fullWidth
              variant="outlined"
              optionText={(choice) => (choice?.email ? `${choice.email} (${choice.uuid})` : choice?.uuid || "")}
            />
          </ReferenceInput>
          <ReferenceInput source="to_user_uuid" reference="admin/users" sort={{ field: "updated_on", order: "DESC" }} perPage={100}>
            <AutocompleteInput
              label="To User"
              fullWidth
              variant="outlined"
              optionText={(choice) => (choice?.email ? `${choice.email} (${choice.uuid})` : choice?.uuid || "")}
            />
          </ReferenceInput>
        </Box>
      </CardContent>
    </Card>

    <Card variant="outlined">
      <CardContent>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>Addresses</Typography>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
          <ReferenceInput source="from_address_uuid" reference="admin/addresses" sort={{ field: "updated_on", order: "DESC" }} perPage={100}>
            <AutocompleteInput
              label="From Address"
              fullWidth
              variant="outlined"
              optionText={(choice) => (choice?.address_name ? `${choice.address_name} (${choice.uuid})` : choice?.uuid || "")}
            />
          </ReferenceInput>
          <ReferenceInput source="to_address_uuid" reference="admin/addresses" sort={{ field: "updated_on", order: "DESC" }} perPage={100}>
            <AutocompleteInput
              label="To Address"
              fullWidth
              variant="outlined"
              optionText={(choice) => (choice?.address_name ? `${choice.address_name} (${choice.uuid})` : choice?.uuid || "")}
            />
          </ReferenceInput>
        </Box>
      </CardContent>
    </Card>

    <Card variant="outlined">
      <CardContent>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.5 }}>Pickup Details</Typography>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
          <TextInput source="shipper_pkreqid" label="Shipper Reference" variant="outlined" fullWidth />
          <DateInput source="pickup_scheduled_date" label="Scheduled Date" variant="outlined" fullWidth />
          <SelectInput source="pickup_status" label="Status" choices={PICKUP_STATUS_CHOICES} variant="outlined" fullWidth />
          <SelectInput source="pickup_mode" label="Mode" choices={PICKUP_MODE_CHOICES} variant="outlined" fullWidth />
        </Box>
        <TextInput source="pickup_instruction" label="Pickup Instruction" variant="outlined" fullWidth multiline minRows={2} sx={{ mt: 1.5 }} />
        <TextInput source="reason_for_cancellation" label="Cancellation Reason" variant="outlined" fullWidth multiline minRows={2} sx={{ mt: 1.5 }} />
      </CardContent>
    </Card>
  </Box>
);

const AdminPickupCreate = () => (
  <Create>
    <SimpleForm>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Create Pickup Request</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>Schedule a pickup request for a user.</Typography>
      <AdminPickupFormFields />
    </SimpleForm>
  </Create>
);

const AdminPickupEdit = () => (
  <Edit>
    <SimpleForm>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Edit Pickup Request</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>Update pickup status and schedule.</Typography>
      <AdminPickupFormFields />
    </SimpleForm>
  </Edit>
);

const AdminPickupShow = () => (
  <Show aside={<PickupRequestHelpfulInfoAside />}>
    <SimpleShowLayout>
      <Box sx={{ width: "100%", maxWidth: 980 }}>
        <AdminPickupResourceIntro />

        <PickupShippingLabelSection />

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827", mb: 1.5 }}>
              Request Summary
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
              }}
            >
              <PickupShowField label="Scheduled Date">
                <RaTextField source="pickup_scheduled_date" />
              </PickupShowField>
              <PickupShowField label="Status">
                <RaTextField source="pickup_status" />
              </PickupShowField>
              <PickupShowField label="No. of Packages">
                <NumberField source="no_of_packages" />
              </PickupShowField>
              <PickupShowField label="From Pincode">
                <FunctionField
                  render={(record) =>
                    record?.from_address?.pincode ||
                    record?.from_pincode ||
                    record?.from_address_pincode ||
                    parsePincodeFromAddress(record?.from_address_display) ||
                    "-"
                  }
                  sx={{ fontWeight: 700 }}
                />
              </PickupShowField>
              <PickupShowField label="To Pincode">
                <FunctionField
                  render={(record) =>
                    record?.to_address?.pincode ||
                    record?.to_pincode ||
                    record?.to_address_pincode ||
                    parsePincodeFromAddress(record?.to_address_display) ||
                    "-"
                  }
                  sx={{ fontWeight: 700 }}
                />
              </PickupShowField>
              <Box sx={{ display: { xs: "none", md: "block" } }} />
              <PickupShowField label="From Address">
                <RaTextField source="from_address_display" />
              </PickupShowField>
              <PickupShowField label="To Address">
                <RaTextField source="to_address_display" />
              </PickupShowField>
              <PickupShowField label="Active">
                <BooleanField source="is_active" />
              </PickupShowField>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827", mb: 1.5 }}>
              Notes
            </Typography>
            <Box sx={{ display: "grid", gap: 2 }}>
              <PickupShowField label="Pickup Instruction">
                <RaTextField source="pickup_instruction" />
              </PickupShowField>
              <PickupShowField label="Reason for Cancellation">
                <RaTextField source="reason_for_cancellation" />
              </PickupShowField>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827", mb: 1.5 }}>
              Audit
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              }}
            >
              <PickupShowField label="Created On">
                <FunctionField render={(record) => formatDateTime(record?.created_on)} />
              </PickupShowField>
              <PickupShowField label="Updated On">
                <FunctionField render={(record) => formatDateTime(record?.updated_on)} />
              </PickupShowField>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </SimpleShowLayout>
  </Show>
);

const inventoryListFilters = [
  <SearchInput key="inventory-search" source="q" alwaysOn placeholder="Search title, ISBN, author, publisher" />,
];

const normalizeIsbnInput = (value) => String(value || "").replace(/[^0-9Xx]/g, "").toUpperCase();

const InventoryIsbnLookup = () => {
  const { setValue } = useFormContext();
  const notify = useNotify();
  const [isbnInput, setIsbnInput] = React.useState("");
  const [isFetching, setIsFetching] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const [coverImage, setCoverImage] = React.useState("");

  const fetchFromIsbn = async () => {
    const normalized = normalizeIsbnInput(isbnInput);
    if (!normalized) {
      const message = "Enter an ISBN to fetch metadata.";
      setStatus({ type: "error", message });
      notify(message, { type: "warning" });
      return;
    }

    setIsFetching(true);
    setStatus(null);

    try {
      const payload = await fetchInventoryIsbnMetadata(normalized);
      const book = payload?.book || {};

      if (!book.title) {
        const message = "No metadata found for this ISBN.";
        setStatus({ type: "error", message });
        notify(message, { type: "warning" });
        return;
      }

      if (book.title) {
        setValue("name", book.title, { shouldDirty: true });
      }
      if (book.short_description) {
        setValue("short_description", book.short_description, { shouldDirty: true });
      }
      if (book.description) {
        setValue("description", book.description, { shouldDirty: true });
      }
      if (book.isbn_13 || book.isbn_10) {
        setValue("upc", book.isbn_13 || book.isbn_10, { shouldDirty: true });
      }
      setValue("isbn_10_input", book.isbn_10 || "", { shouldDirty: true });
      setValue("isbn_13_input", book.isbn_13 || "", { shouldDirty: true });
      setValue("author_name_input", (book.authors || []).join(", "), { shouldDirty: true });
      setValue("publisher_name_input", book.publisher_name || "", { shouldDirty: true });
      setValue("book_language_input", book.book_language || "", { shouldDirty: true });
      setValue("page_count_input", Number(book.page_count || 0), { shouldDirty: true });
      setValue("published_year_input", Number(book.published_year || 0), { shouldDirty: true });

      setCoverImage(book.cover_image_url || "");
      const successMessage = `Scan success from ${payload.source || "provider"}. Fields auto-filled.`;
      setStatus({ type: "success", message: successMessage });
      notify("ISBN metadata fetched and fields auto-filled.", { type: "success" });
    } catch (error) {
      const message = firstErrorMessage(error?.body, "Failed to fetch ISBN metadata.");
      setStatus({ type: "error", message });
      setCoverImage("");
      notify(message, { type: "error" });
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#1f2937", mb: 0.75 }}>
        Scan / Search by ISBN
      </Typography>
      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "1fr" }}>
        <TextField
          label="ISBN"
          variant="outlined"
          value={isbnInput}
          onChange={(event) => setIsbnInput(normalizeIsbnInput(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              fetchFromIsbn();
            }
          }}
          placeholder="Enter ISBN and press Enter"
          fullWidth
          sx={{ "& .MuiInputBase-root": { height: 40 } }}
        />
        <Button
          variant="contained"
          onClick={fetchFromIsbn}
          disabled={isFetching}
          sx={{ width: "100%", height: 40 }}
        >
          {isFetching ? "Fetching..." : "Fetch ISBN Data"}
        </Button>
      </Box>
      {status ? (
        <Alert severity={status.type === "success" ? "success" : "error"} sx={{ mt: 1 }}>
          {status.message}
        </Alert>
      ) : null}
      {coverImage ? (
        <Box
          component="img"
          src={coverImage}
          alt="Fetched book cover"
          sx={{ mt: 1, width: 100, height: 140, objectFit: "cover", borderRadius: 1, border: "1px solid #e5e7eb" }}
        />
      ) : null}
    </Box>
  );
};

const InventoryList = () => {
  const { identity } = useGetIdentity();
  const canManage = canManageSellerInventory(identity?.plan);

  return (
    <List
      perPage={25}
      sort={{ field: "updated_on", order: "DESC" }}
      filters={inventoryListFilters}
      aside={<InventoryHelpfulInfoAside />}
      actions={<InventoryListActions />}
    >
      <>
        <InventoryResourceIntro />
        {!canManage ? (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            Your current plan allows inventory viewing only. Switch to Self Sell to add, edit, or delete inventory.
          </Alert>
        ) : null}
        <Datagrid rowClick="show">
          <RaTextField source="name" label="Title" />
          <RaTextField source="isbn_13" label="ISBN-13" />
          <RaTextField source="author_name" label="Author" />
          <RaTextField source="publisher_name" label="Publisher" />
          <FunctionField label="Quality" render={(record) => getInventoryQualityLabel(record) || "-"} />
          <NumberField source="min_retail_price" label="Min Retail Price" />
          <NumberField source="stock_quantity" label="Qty" />
          <BooleanField source="is_active" label="Active" />
          <FunctionField
            label="Date Added"
            render={(record) => formatDateTime(record?.created_on)}
          />
          <FunctionField
            label="Last Updated"
            render={(record) => formatDateTime(record?.updated_on)}
          />
          <FunctionField
            label="Actions"
            sortable={false}
            render={(record) => (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                <ShowButton resource="my/inventories" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
                {canManage ? (
                  <EditButton resource="my/inventories" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
                ) : null}
                {canManage ? (
                  <DeleteButton
                    resource="my/inventories"
                    record={record}
                    label={false}
                    sx={{ minWidth: 0, px: 0.5 }}
                  />
                ) : null}
              </Box>
            )}
          />
        </Datagrid>
      </>
    </List>
  );
};

const InventoryBookLanguageInput = () => {
  const { data: languages = [], isLoading } = useGetList("lookups/languages", {
    filter: {},
    pagination: { page: 1, perPage: 500 },
    sort: { field: "name", order: "ASC" },
  });

  const languageChoices = React.useMemo(
    () =>
      languages.map((language) => ({
        id: language.code,
        name: `${language.name} (${language.code})`,
      })),
    [languages]
  );

  return (
    <SelectInput
      source="book_language_input"
      label="Book Language"
      choices={languageChoices}
      optionText="name"
      optionValue="id"
      variant="outlined"
      fullWidth
      disabled={isLoading}
    />
  );
};

const splitAuthorNames = (value) =>
  String(value || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

const InventoryAuthorAutocompleteArrayInput = () => {
  const { watch } = useFormContext();
  const { data: authors = [], isLoading } = useGetList("inventory/authors", {
    filter: {},
    pagination: { page: 1, perPage: 500 },
    sort: { field: "name", order: "ASC" },
  });

  const selectedAuthorNames = splitAuthorNames(watch("author_name_input"));
  const authorChoices = React.useMemo(
    () =>
      Array.from(
        new Set([
          ...authors
            .map((author) => String(author?.name || "").trim())
            .filter(Boolean),
          ...selectedAuthorNames,
        ])
      ).map((name) => ({ id: name, name })),
    [authors, selectedAuthorNames]
  );

  return (
    <AutocompleteArrayInput
      name="author_name_input"
      source="author_name_input"
      label="Author(s)"
      choices={authorChoices}
      optionText="name"
      optionValue="id"
      fullWidth
      variant="outlined"
      isPending={isLoading}
      format={(value) => splitAuthorNames(value)}
      parse={(value) =>
        Array.isArray(value)
          ? Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean))).join(", ")
          : ""
      }
    />
  );
};

const InventoryPublisherAutocompleteInput = () => {
  const { watch } = useFormContext();
  const { data: publishers = [], isLoading } = useGetList("inventory/publishers", {
    filter: {},
    pagination: { page: 1, perPage: 500 },
    sort: { field: "name", order: "ASC" },
  });

  const selectedPublisher = String(watch("publisher_name_input") || "").trim();
  const publisherChoices = React.useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...publishers
              .map((publisher) => String(publisher?.name || "").trim())
              .filter(Boolean),
            selectedPublisher,
          ].filter(Boolean)
        )
      ).map((name) => ({ id: name, name })),
    [publishers, selectedPublisher]
  );

  return (
    <AutocompleteInput
      source="publisher_name_input"
      label="Publisher"
      choices={publisherChoices}
      optionText="name"
      optionValue="id"
      fullWidth
      variant="outlined"
      isPending={isLoading}
      emptyText="Select publisher"
      parse={(value) => String(value || "").trim()}
      format={(value) => String(value || "").trim()}
    />
  );
};

const InventoryTagsInput = () => {
  const { watch } = useFormContext();
  const { data: tags = [], isLoading } = useGetList("inventory/tags", {
    filter: {},
    pagination: { page: 1, perPage: 500 },
    sort: { field: "name", order: "ASC" },
  });

  const selectedTags = Array.isArray(watch("tags")) ? watch("tags") : [];
  const tagChoices = React.useMemo(
    () =>
      Array.from(
        new Set([
          ...tags.map((tag) => String(tag?.name || "").trim()).filter(Boolean),
          ...selectedTags.map((tag) => String(tag || "").trim()).filter(Boolean),
        ])
      ).map((name) => ({ id: name, name })),
    [tags, selectedTags]
  );

  return (
    <AutocompleteArrayInput
      source="tags"
      label="Tags"
      choices={tagChoices}
      optionText="name"
      optionValue="id"
      fullWidth
      variant="outlined"
      isPending={isLoading}
      parse={(value) =>
        Array.isArray(value)
          ? Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean)))
          : []
      }
      format={(value) => (Array.isArray(value) ? value : [])}
    />
  );
};

const InventoryCategoryAutocompleteArrayInput = () => {
  const { data: categories = [], isLoading } = useGetList("inventory/categories", {
    filter: {},
    pagination: { page: 1, perPage: 500 },
    sort: { field: "name", order: "ASC" },
  });

  const categoryChoices = React.useMemo(
    () =>
      categories.map((category) => ({
        id: category.uuid,
        name: category.name,
      })),
    [categories]
  );

  return (
    <AutocompleteArrayInput
      source="category_uuid"
      label="Category"
      choices={categoryChoices}
      optionText="name"
      optionValue="id"
      fullWidth
      variant="outlined"
      isPending={isLoading}
      validate={required("Category is required.")}
      parse={(value) => (Array.isArray(value) && value.length ? String(value[0]) : "")}
      format={(value) => (value ? [String(value)] : [])}
    />
  );
};

const InventoryImagesTab = () => {
  const record = useRecordContext();
  const provider = useDataProvider();
  const notify = useNotify();
  const [attachments, setAttachments] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState("");

  const loadAttachments = React.useCallback(async () => {
    if (!record?.uuid) return;
    setIsLoading(true);
    setError("");
    try {
      const payload = await requestApi(
        `/photos/by-target/?target_type=product&target_uuid=${encodeURIComponent(
          record.uuid
        )}&relation_type=gallery`
      );
      setAttachments(Array.isArray(payload?.results) ? payload.results : []);
    } catch (err) {
      setError(
        firstErrorMessage(
          err?.body,
          err?.message || "Unable to load images."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [record?.uuid]);

  React.useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const handleFiles = async (files) => {
    if (!record?.uuid) {
      notify("Save the inventory first before adding images.", {
        type: "warning",
      });
      return;
    }
    const fileArray = Array.from(files || []);
    if (!fileArray.length) return;

    setIsLoading(true);
    setError("");
    try {
      const hasPrimary = attachments.some((item) => item?.is_primary);
      for (let index = 0; index < fileArray.length; index += 1) {
        const file = fileArray[index];
        const photoResponse = await provider.create("photos", {
          data: { file },
        });
        const photoUuid = photoResponse?.data?.uuid;
        if (!photoUuid) continue;
        await requestApi(`/photos/${photoUuid}/attach/`, {
          method: "POST",
          body: {
            target_type: "product",
            target_uuid: record.uuid,
            relation_type: "gallery",
            is_primary: !hasPrimary && index === 0,
            sort_order: attachments.length + index,
          },
        });
      }
      await loadAttachments();
      notify("Images uploaded successfully.", { type: "success" });
    } catch (err) {
      const message = firstErrorMessage(
        err?.body,
        err?.message || "Unable to upload images."
      );
      setError(message);
      notify(message, { type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer?.files?.length) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const slots = 5;
  const slotItems = Array.from({ length: slots }, (_, index) => attachments[index] || null);

  return (
    <Stack spacing={2}>
      <Box
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        sx={{
          border: "2px dashed",
          borderColor: isDragging ? "#0A4A47" : "#d1d5db",
          borderRadius: 2,
          p: 3,
          backgroundColor: isDragging ? "rgba(10, 74, 71, 0.08)" : "#f9fafb",
          textAlign: "center",
        }}
      >
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          <PhotoCameraOutlinedIcon sx={{ color: "#0A4A47" }} />
          <Typography sx={{ fontWeight: 700, color: "#0A4A47" }}>
            Drag & Drop images here
          </Typography>
        </Box>
        <Typography sx={{ mt: 0.5, fontSize: 13, color: "#6b7280" }}>
          First image will be used as the featured image.
        </Typography>
        <Button
          component="label"
          variant="outlined"
          sx={{ mt: 1.5 }}
          disabled={isLoading}
        >
          Browse Images
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => handleFiles(event.target.files)}
          />
        </Button>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {isLoading ? (
        <Typography sx={{ fontSize: 13, color: "#6b7280" }}>
          Loading images...
        </Typography>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(5, minmax(0, 1fr))" },
        }}
      >
        {slotItems.map((item, index) => {
          const photo = item?.photo;
          const imageUrl = toAbsoluteUrl(photo?.effective_url || photo?.cdn_url || "");
          const isFeatured = index === 0;
          return (
            <Box
              key={item?.uuid || `placeholder-${index}`}
              sx={{
                position: "relative",
                borderRadius: 2,
                border: "1px dashed #d1d5db",
                height: 140,
                overflow: "hidden",
                backgroundColor: "#f9fafb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {imageUrl ? (
                <Box
                  component="img"
                  src={imageUrl}
                  alt={photo?.alt_tag || `Inventory image ${index + 1}`}
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Stack spacing={0.5} alignItems="center">
                  <PhotoCameraOutlinedIcon sx={{ color: "#9ca3af" }} />
                  <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>
                    Image {index + 1}
                  </Typography>
                </Stack>
              )}
              {isFeatured ? (
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    px: 1,
                    py: 0.25,
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: "#0A4A47",
                    color: "#fff",
                  }}
                >
                  Featured
                </Box>
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
};

const InventoryFormFields = ({
  showImagesTab = false,
  sellOptionLocked = false,
  qualityStartsNewRow = false,
}) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const {
    formState: { errors },
  } = useFormContext();
  const hasTabError = (tabIndex) =>
    INVENTORY_TAB_FIELDS[tabIndex]?.some((field) => Boolean(errors?.[field]));

  return (
    <Card variant="outlined" sx={{ width: "100%", alignSelf: "stretch" }}>
      <CardContent>
        <FormDataConsumer>
          {({ formData }) => {
            const productKind = String(formData?.product_category_kind || "BOOK").toUpperCase();
            const qualityChoices = getInventoryQualityChoices(formData);
            const showQualityFields = productKind === "BOOK";
            return (
              <>
                <Box sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      border: "1px solid #e5e7eb",
                      borderRadius: 1.5,
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    <SelectInput
                      source="product_category_kind"
                      label="Category Of Product"
                      choices={PRODUCT_CATEGORY_KIND_CHOICES}
                      variant="outlined"
                      fullWidth
                    />
                  </Box>
                </Box>

                {productKind === "BOOK" ? (
                  <Box
                    sx={{
                      mb: 2,
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns: { xs: "1fr", lg: "30% 70%" },
                      alignItems: "start",
                    }}
                  >
                    <Box>
                      <InventoryIsbnLookup />
                    </Box>
                    <Box />
                  </Box>
                ) : null}

                <Tabs
                  value={activeTab}
                  onChange={(_, nextTab) => setActiveTab(nextTab)}
                  variant="fullWidth"
                  sx={{ mb: 2, width: "100%" }}
                >
                  <Tab label={inventoryTabLabel("Primary Info", hasTabError(0))} />
                  <Tab label={inventoryTabLabel("Classification", hasTabError(1))} />
                  <Tab label={inventoryTabLabel("Pricing", hasTabError(2))} />
                  <Tab label={inventoryTabLabel("Dimensions", hasTabError(3))} />
                  {showImagesTab ? (
                    <Tab label={inventoryTabLabel("Images", hasTabError(4))} />
                  ) : null}
                </Tabs>

                {activeTab === 0 ? (
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 1.5,
                        gridTemplateColumns: { xs: "1fr", md: "repeat(12, minmax(0, 1fr))" },
                      }}
                    >
                      <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 8" } }}>
                        <TextInput
                          source="name"
                          label="Product Title"
                          variant="outlined"
                          fullWidth
                          validate={required("Title is required.")}
                        />
                      </Box>
                      <Box
                        sx={{
                          display: { xs: "none", md: "block" },
                          gridColumn: "span 4",
                        }}
                      />

                      {productKind === "BOOK" ? (
                        <>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 2" } }}>
                            <TextInput source="book_edition_input" label="Book Edition" variant="outlined" fullWidth />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 2" } }}>
                            <SelectInput
                              source="cover_type_input"
                              label="Cover Type"
                              choices={PRODUCT_FORMAT_CHOICES}
                              variant="outlined"
                              fullWidth
                            />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 3" } }}>
                            <InventoryBookLanguageInput />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 6" } }}>
                            <InventoryAuthorAutocompleteArrayInput />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 3" } }}>
                            <InventoryPublisherAutocompleteInput />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 4" } }}>
                            <TextInput source="isbn_10_input" label="ISBN-10" variant="outlined" fullWidth />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 4" } }}>
                            <TextInput source="isbn_13_input" label="ISBN-13" variant="outlined" fullWidth />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 4" } }}>
                            <TextInput source="sku" label="SKU (optional)" variant="outlined" fullWidth />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 3" } }}>
                            <NumberInput source="page_count_input" label="Page Count" variant="outlined" fullWidth />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 3" } }}>
                            <NumberInput
                              source="published_year_input"
                              label="Published Year"
                              variant="outlined"
                              fullWidth
                            />
                          </Box>
                        </>
                      ) : null}

                      {productKind === "SOAP" ? (
                        <>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 4" } }}>
                            <TextInput source="soap_brand_input" label="Brand" variant="outlined" fullWidth />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 4" } }}>
                            <TextInput source="soap_fragrance_input" label="Fragrance" variant="outlined" fullWidth />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 4" } }}>
                            <TextInput source="sku" label="SKU (optional)" variant="outlined" fullWidth />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 4" } }}>
                            <NumberInput
                              source="soap_net_weight_grams_input"
                              label="Net Weight (grams)"
                              variant="outlined"
                              fullWidth
                            />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 4" } }}>
                            <TextInput source="soap_skin_type_input" label="Skin Type" variant="outlined" fullWidth />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 4" } }}>
                            <NumberInput
                              source="soap_shelf_life_months_input"
                              label="Shelf Life (months)"
                              variant="outlined"
                              fullWidth
                            />
                          </Box>
                        </>
                      ) : null}

                      {productKind === "OTHERS" ? (
                        <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 4" } }}>
                          <TextInput source="sku" label="SKU (optional)" variant="outlined" fullWidth />
                        </Box>
                      ) : null}

                      {productKind === "BOOK" ? (
                        <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 3" } }}>
                          <SelectInput
                            source="sell_option"
                            choices={INVENTORY_SELL_OPTION_CHOICES}
                            label="Sell Option"
                            variant="outlined"
                            fullWidth
                            disabled={sellOptionLocked}
                          />
                        </Box>
                      ) : null}
                      {showQualityFields ? (
                        <>
                          {qualityStartsNewRow ? (
                            <Box
                              sx={{
                                display: { xs: "none", md: "block" },
                                gridColumn: "span 9",
                              }}
                            />
                          ) : null}
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 2" } }}>
                            <SelectInput
                              source="quality"
                              choices={qualityChoices}
                              label="Quality"
                              variant="outlined"
                              fullWidth
                            />
                          </Box>
                          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 6" } }}>
                            <TextInput
                              source="quality_note"
                              label="Quality Note"
                              variant="outlined"
                              fullWidth
                              helperText="Optional book condition details."
                            />
                          </Box>
                        </>
                      ) : null}
                      <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 1" } }}>
                        <NumberInput source="stock_quantity" label="Qty" variant="outlined" fullWidth />
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                      }}
                    >
                      <BooleanInput source="is_featured" />
                      <BooleanInput source="is_active" />
                    </Box>
                  </Stack>
                ) : null}

                {activeTab === 1 ? (
                  <Box
                    sx={{
                      display: "grid",
                      gap: 1.5,
                      gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                    }}
                  >
                    <InventoryCategoryAutocompleteArrayInput />
                    <InventoryTagsInput />
                  </Box>
                ) : null}

                {activeTab === 2 ? (
                  <Stack spacing={1.5}>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 1.5,
                        gridTemplateColumns: { xs: "1fr", md: "1fr auto 1fr auto 1fr" },
                        alignItems: "center",
                      }}
                    >
                      <NumberInput
                        source="min_retail_price"
                        label="Min Retail Price"
                        variant="outlined"
                        fullWidth
                        validate={validateMinRetailPrice}
                      />
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#0A4A47",
                          px: 0.5,
                        }}
                      >
                        <ChevronLeftRoundedIcon sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }} />
                        <Typography sx={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>
                          Min &lt; Sale
                        </Typography>
                      </Box>
                      <NumberInput
                        source="sale_price"
                        label="Sale Price"
                        variant="outlined"
                        fullWidth
                        validate={validateSalePrice}
                      />
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#0A4A47",
                          px: 0.5,
                        }}
                      >
                        <ChevronLeftRoundedIcon sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }} />
                        <Typography sx={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>
                          Sale &lt; MRP
                        </Typography>
                      </Box>
                      <NumberInput
                        source="max_retail_price"
                        label="Max Retail Price"
                        variant="outlined"
                        fullWidth
                        validate={validateMaxRetailPrice}
                      />
                    </Box>
                    <Typography sx={{ fontSize: 12, color: "#0f172a" }}>
                      Special promo about 1 Re Store - Only the shipping fees + Product cost is 1 Re.
                    </Typography>
                  </Stack>
                ) : null}

                {activeTab === 3 ? (
                  <Stack spacing={1.5}>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 1.5,
                        gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                      }}
                    >
                      <NumberInput
                        source="product_dimension_length"
                        label="Length (CM)"
                        variant="outlined"
                        fullWidth
                        validate={validatePositiveNumber("Length")}
                      />
                      <NumberInput
                        source="product_dimension_breadth"
                        label="Breadth (CM)"
                        variant="outlined"
                        fullWidth
                        validate={validatePositiveNumber("Breadth")}
                      />
                      <NumberInput
                        source="product_dimension_height"
                        label="Height (CM)"
                        variant="outlined"
                        fullWidth
                        validate={validatePositiveNumber("Height")}
                      />
                    </Box>
                    <NumberInput
                      source="product_dimension_weight"
                      label="Weight (GM)"
                      variant="outlined"
                      fullWidth
                      validate={validatePositiveNumber("Weight")}
                    />
                  </Stack>
                ) : null}

                {showImagesTab && activeTab === 4 ? <InventoryImagesTab /> : null}
              </>
            );
          }}
        </FormDataConsumer>
      </CardContent>
    </Card>
  );
};

const INVENTORY_DEFAULT_VALUES = {
  product_category_kind: "BOOK",
  sell_option: "SMART_SELL",
  quality: "USED_LOOKS_GOOD",
  quality_note: "",
  stock_quantity: 1,
  min_retail_price: 0,
  max_retail_price: 0,
  sale_price: 0,
  product_dimension_length: 0,
  product_dimension_breadth: 0,
  product_dimension_height: 0,
  product_dimension_weight: 0,
  soap_net_weight_grams_input: 0,
  soap_shelf_life_months_input: 0,
  is_featured: false,
  is_active: true,
};

const toFiniteNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const validatePositiveNumber = (label) => (value) => {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return `${label} is required.`;
  if (parsed <= 0) return `${label} must be greater than 0.`;
  return undefined;
};

const validateMinRetailPrice = (value, allValues) => {
  const minRetailPrice = toFiniteNumber(value);
  const salePrice = toFiniteNumber(allValues?.sale_price);
  if (minRetailPrice === null || salePrice === null) return undefined;
  if (minRetailPrice >= salePrice) {
    return "Min retail price must be less than selling price.";
  }
  return undefined;
};

const validateSalePrice = (value, allValues) => {
  const salePrice = toFiniteNumber(value);
  const minRetailPrice = toFiniteNumber(allValues?.min_retail_price);
  const maxRetailPrice = toFiniteNumber(allValues?.max_retail_price);
  if (salePrice === null) return undefined;
  if (minRetailPrice !== null && salePrice <= minRetailPrice) {
    return "Selling price must be greater than min retail price.";
  }
  if (maxRetailPrice !== null && salePrice >= maxRetailPrice) {
    return "Selling price must be less than max retail price.";
  }
  return undefined;
};

const validateMaxRetailPrice = (value, allValues) => {
  const maxRetailPrice = toFiniteNumber(value);
  const salePrice = toFiniteNumber(allValues?.sale_price);
  if (maxRetailPrice === null || salePrice === null) return undefined;
  if (maxRetailPrice <= salePrice) {
    return "Max retail price must be greater than selling price.";
  }
  return undefined;
};

const INVENTORY_TAB_FIELDS = {
  0: [
    "name",
    "book_edition_input",
    "cover_type_input",
    "book_language_input",
    "author_name_input",
    "publisher_name_input",
    "isbn_10_input",
    "isbn_13_input",
    "sku",
    "page_count_input",
    "published_year_input",
    "soap_brand_input",
    "soap_fragrance_input",
    "soap_net_weight_grams_input",
    "soap_skin_type_input",
    "soap_shelf_life_months_input",
    "sell_option",
    "quality",
    "quality_note",
    "stock_quantity",
    "is_featured",
    "is_active",
  ],
  1: ["category_uuid", "tags"],
  2: ["min_retail_price", "sale_price", "max_retail_price"],
  3: [
    "product_dimension_length",
    "product_dimension_breadth",
    "product_dimension_height",
    "product_dimension_weight",
  ],
  4: [],
};

const inventoryTabLabel = (label, hasError) => (hasError ? `${label} !` : label);

const renderApiErrorLines = (error) => {
  const fieldErrors = normalizeFieldErrors(error?.body);
  const lines = Object.entries(fieldErrors)
    .filter(([, messages]) => Array.isArray(messages) && messages.length)
    .map(([field, messages]) => `${field}: ${messages[0]}`);

  return lines.length
    ? lines
    : [firstErrorMessage(error?.body, error?.message || "Unable to save inventory.")];
};

const InventoryCreate = () => {
  const { identity } = useGetIdentity();
  const notify = useNotify();
  const redirect = useRedirect();
  const preferredSellOption = identity?.plan || "SMART_SELL";
  const canManage = canManageSellerInventory(identity?.plan);
  const [apiErrorLines, setApiErrorLines] = React.useState([]);
  const defaultValues = React.useMemo(
    () => ({
      ...INVENTORY_DEFAULT_VALUES,
      sell_option: preferredSellOption,
    }),
    [preferredSellOption]
  );

  React.useEffect(() => {
    document.title = "Add inventory - My Inventory";
  }, []);

  React.useEffect(() => {
    if (identity && !canManage) {
      notify("Only Self Sell users can add inventory.", { type: "warning" });
      redirect("/my/inventories");
    }
  }, [canManage, identity, notify, redirect]);

  if (identity && !canManage) return null;

  return (
    <Create
      aside={<InventoryHelpfulInfoAside />}
      mutationOptions={{
        onSuccess: () => {
          setApiErrorLines([]);
          notify("Product created.", { type: "success" });
        },
        onError: (error) => {
          const lines = renderApiErrorLines(error);
          setApiErrorLines(lines);
          notify(lines.join(" | "), { type: "error" });
        },
      }}
    >
      <SimpleForm
        defaultValues={defaultValues}
        transform={inventoryFormTransform}
        sx={{ maxWidth: 980, width: "100%" }}
      >
        {apiErrorLines.length ? (
          <Alert severity="error" sx={{ width: "100%" }}>
            {apiErrorLines.map((line) => (
              <Box key={line}>{line}</Box>
            ))}
          </Alert>
        ) : null}
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>
          Create Inventory
        </Typography>
        <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
          Add product details for your store inventory.
        </Typography>
        <InventoryFormFields showImagesTab sellOptionLocked />
      </SimpleForm>
    </Create>
  );
};

const InventoryEdit = () => {
  const { identity } = useGetIdentity();
  const notify = useNotify();
  const redirect = useRedirect();
  const canManage = canManageSellerInventory(identity?.plan);
  const [apiErrorLines, setApiErrorLines] = React.useState([]);

  React.useEffect(() => {
    if (identity && !canManage) {
      notify("Only Self Sell users can edit inventory.", { type: "warning" });
      redirect("/my/inventories");
    }
  }, [canManage, identity, notify, redirect]);

  if (identity && !canManage) return null;

  return (
    <Edit
      aside={<InventoryHelpfulInfoAside />}
      mutationOptions={{
        onSuccess: () => setApiErrorLines([]),
        onError: (error) => {
          const lines = renderApiErrorLines(error);
          setApiErrorLines(lines);
          notify(lines.join(" | "), { type: "error" });
        },
      }}
    >
      <SimpleForm
        transform={inventoryFormTransform}
        sx={{ maxWidth: 980, width: "100%" }}
      >
        {apiErrorLines.length ? (
          <Alert severity="error" sx={{ width: "100%" }}>
            {apiErrorLines.map((line) => (
              <Box key={line}>{line}</Box>
            ))}
          </Alert>
        ) : null}
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>
          Edit Inventory
        </Typography>
        <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
          Update inventory details, pricing, and quantity.
        </Typography>
        <InventoryFormFields showImagesTab sellOptionLocked />
      </SimpleForm>
    </Edit>
  );
};

const AdminInventoryCreate = () => {
  const notify = useNotify();

  return (
    <Create
      aside={<InventoryHelpfulInfoAside />}
      mutationOptions={{
        onSuccess: () => {
          notify("Product created.", { type: "success" });
        },
      }}
    >
      <SimpleForm
        defaultValues={{ ...INVENTORY_DEFAULT_VALUES }}
        transform={inventoryFormTransform}
        sx={{ maxWidth: 980, width: "100%" }}
      >
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Create Inventory</Typography>
        <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
          Add inventory items for any seller.
        </Typography>
        <AdminInventoryFormFields />
      </SimpleForm>
    </Create>
  );
};

const InventoryShowContent = () => {
  const record = useRecordContext();
  if (!record) return null;

  const formatCurrency = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(number);
  };

  const tags = Array.isArray(record.tags) ? record.tags : [];
  const isbnForCover = record.isbn_13 || record.isbn_10 || "";
  const coverUrl = isbnForCover
    ? `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbnForCover)}-L.jpg`
    : "";
  const [coverLoadError, setCoverLoadError] = React.useState(false);

  React.useEffect(() => {
    setCoverLoadError(false);
  }, [coverUrl]);

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "repeat(12, minmax(0, 1fr))" },
            }}
          >
            <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 4" } }}>
              {coverUrl && !coverLoadError ? (
                <Box
                  component="img"
                  src={coverUrl}
                  alt={record.name || "Book cover"}
                  onError={() => setCoverLoadError(true)}
                  sx={{
                    width: "100%",
                    maxWidth: 260,
                    height: 320,
                    objectFit: "cover",
                    borderRadius: 1.5,
                    border: "1px solid #e5e7eb",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 260,
                    height: 320,
                    borderRadius: 1.5,
                    border: "1px dashed #d1d5db",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6b7280",
                    fontSize: 13,
                  }}
                >
                  No cover image
                </Box>
              )}
            </Box>

            <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 8" } }}>
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) auto" },
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
                    {record.name || "Inventory Item"}
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 17, color: "#4b5563" }}>
                    <Box component="span">by - </Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {record.author_name || "-"}
                    </Box>
                  </Typography>
                  <Typography sx={{ mt: 1.5, fontSize: 17, color: "#374151" }}>
                    <Box component="span">Publisher : </Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {record.publisher_name || "-"}
                    </Box>
                  </Typography>
                  <Typography sx={{ mt: 1.5, fontSize: 16, color: "#6b7280" }}>PFS ID</Typography>
                  <Typography sx={{ fontSize: 34, fontWeight: 800, color: "#0A4A47", lineHeight: 1 }}>
                    {record.pk ?? "-"}
                  </Typography>
                  <Typography sx={{ mt: 1, fontSize: 16, color: "#6b7280" }}>
                    <Box component="span">ISBN-10: </Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {record.isbn_10 || "-"}
                    </Box>
                  </Typography>
                  <Typography sx={{ mt: 0.25, fontSize: 16, color: "#6b7280" }}>
                    <Box component="span">ISBN-13: </Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {record.isbn_13 || "-"}
                    </Box>
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 16, color: "#6b7280" }}>
                    <Box component="span">SKU: </Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {record.sku || "-"}
                    </Box>
                  </Typography>
                  {tags.length ? (
                    <Box sx={{ mt: 1.25, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                      {tags.map((tag) => (
                        <Box
                          key={tag}
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#155E75",
                            backgroundColor: "#E0F2FE",
                          }}
                        >
                          {tag}
                        </Box>
                      ))}
                    </Box>
                  ) : null}
                </Box>

                <Box sx={{ minWidth: { lg: 260 } }}>
                  <Typography sx={{ fontSize: 19, fontWeight: 700, color: "#111827", mb: 1 }}>Price</Typography>
                  <Typography sx={{ fontSize: 17, color: "#374151" }}>
                    <Box component="span">Min Retail Price: </Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {formatCurrency(record.min_retail_price)}
                    </Box>
                  </Typography>
                  <Typography sx={{ fontSize: 17, color: "#374151" }}>
                    <Box component="span">Max Retail Price: </Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {formatCurrency(record.max_retail_price)}
                    </Box>
                  </Typography>
                  <Typography sx={{ fontSize: 17, color: "#374151" }}>
                    <Box component="span">Sale Price: </Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {formatCurrency(record.sale_price)}
                    </Box>
                  </Typography>
                  <Typography sx={{ mt: 1, fontSize: 17, color: "#374151" }}>
                    <Box component="span">Stock Qty: </Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {record.stock_quantity ?? "-"}
                    </Box>
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      fontSize: 17,
                      color: record.is_featured ? "#047857" : "#b91c1c",
                    }}
                  >
                    <Box component="span">Featured: </Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {record.is_featured ? "Yes" : "No"}
                    </Box>
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 17,
                      color: record.is_active ? "#047857" : "#b91c1c",
                    }}
                  >
                    <Box component="span">Active: </Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {record.is_active ? "Yes" : "No"}
                    </Box>
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1.25 }}>Short description</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>{record.short_description || "-"}</Typography>
          <Typography sx={{ mt: 1.5, fontSize: 16, fontWeight: 700, color: "#111827", mb: 1 }}>Long description</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>{record.description || "-"}</Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1 }}>Dimensions</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 14, color: "#374151" }}>
              L x B x H in Cm : {record.product_dimension_length ?? "-"} x {record.product_dimension_breadth ?? "-"} x{" "}
              {record.product_dimension_height ?? "-"} cm
            </Typography>
            <Typography sx={{ fontSize: 14, color: "#374151" }}>
              Weight: {record.product_dimension_weight ?? "-"} grams
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1 }}>Meta</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151", wordBreak: "break-all" }}>UUID: {record.uuid || "-"}</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>Created On: {formatDateTime(record.created_on)}</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>Updated On: {formatDateTime(record.updated_on)}</Typography>
          <Typography sx={{ mt: 0.75, fontSize: 14, color: "#374151" }}>
            Inventory Note: {record.inventory_note || "-"}
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
};

const InventoryShow = () => (
  <Show aside={<InventoryHelpfulInfoAside />} actions={false}>
    <InventoryShowContent />
  </Show>
);

const AuthorList = () => (
  <List perPage={25} sort={{ field: "name", order: "ASC" }}>
    <>
      <AuthorResourceIntro />
      <Datagrid rowClick="show">
        <FunctionField
          label="Photo"
          render={(record) => {
            const src = toAbsoluteUrl(record?.photo_url);
            return src ? (
              <Box
                component="img"
                src={src}
                alt={record?.name || "Author"}
                sx={{ width: 40, height: 40, objectFit: "cover", borderRadius: "50%", border: "1px solid #e5e7eb" }}
              />
            ) : (
              "-"
            );
          }}
        />
        <RaTextField source="name" />
        <RaTextField source="slug" />
        <RaTextField source="bio" />
        <BooleanField source="is_featured" label="Featured" />
        <BooleanField source="is_active" label="Active" />
        <FunctionField label="Created On" render={(record) => formatDateTime(record?.created_on)} />
        <FunctionField label="Updated On" render={(record) => formatDateTime(record?.updated_on)} />
        <FunctionField
          label="Actions"
          sortable={false}
          render={(record) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <EditButton resource="inventory/authors" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
              <ShowButton resource="inventory/authors" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
              <DeleteButton
                resource="inventory/authors"
                record={record}
                label={false}
                sx={{ minWidth: 0, px: 0.5 }}
              />
            </Box>
          )}
        />
      </Datagrid>
    </>
  </List>
);

const AuthorFormFields = () => (
  <Box sx={{ display: "grid", gap: 1.5 }}>
    <TextInput source="name" label="Name" fullWidth variant="outlined" validate={required("Name is required.")} />
    <TextInput source="slug" label="Slug" fullWidth variant="outlined" />
    <TextInput source="bio" label="Bio" fullWidth variant="outlined" multiline minRows={4} />
    <ReferenceInput source="photo_uuid" reference="photos" sort={{ field: "created_on", order: "DESC" }} perPage={100}>
      <AutocompleteInput
        label="Author Photo"
        fullWidth
        optionText={(choice) => (choice?.file_name ? `${choice.file_name} (${choice.id})` : choice?.id || "")}
      />
    </ReferenceInput>
    <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
      <BooleanInput source="is_featured" />
      <BooleanInput source="is_active" />
    </Box>
  </Box>
);

const AuthorCreate = () => (
  <Create>
    <SimpleForm defaultValues={{ is_featured: false, is_active: true }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Create Author</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>Add an author for book inventory mapping.</Typography>
      <AuthorFormFields />
    </SimpleForm>
  </Create>
);

const AuthorEdit = () => (
  <Edit>
    <SimpleForm>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Edit Author</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
        Update author details used across inventory.
      </Typography>
      <AuthorFormFields />
    </SimpleForm>
  </Edit>
);

const AuthorShowContent = () => {
  const record = useRecordContext();
  if (!record) return null;
  const photoSrc = toAbsoluteUrl(record?.photo_url);

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) auto" },
              alignItems: "start",
            }}
          >
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Box
                sx={{
                  width: 84,
                  height: 84,
                  borderRadius: "50%",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#f9fafb",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {photoSrc ? (
                  <Box component="img" src={photoSrc} alt={record.name || "Author"} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  "No photo"
                )}
              </Box>
              <Box>
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1.15 }}>
                {record.name || "-"}
              </Typography>
              <Typography sx={{ mt: 0.75, fontSize: 14, color: "#6b7280" }}>Slug: {record.slug || "-"}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: { lg: "flex-end" } }}>
              <Box
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: record.is_active ? "#065F46" : "#991B1B",
                  backgroundColor: record.is_active ? "#ECFDF5" : "#FEF2F2",
                }}
              >
                {record.is_active ? "Active" : "Inactive"}
              </Box>
              <Box
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: record.is_featured ? "#075985" : "#374151",
                  backgroundColor: record.is_featured ? "#E0F2FE" : "#F3F4F6",
                }}
              >
                {record.is_featured ? "Featured" : "Not Featured"}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1 }}>Biography</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151", whiteSpace: "pre-wrap" }}>{record.bio || "-"}</Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1 }}>Meta</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151", wordBreak: "break-all" }}>UUID: {record.uuid || "-"}</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151", wordBreak: "break-all" }}>
            Photo UUID: {record.photo_uuid || "-"}
          </Typography>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>Created On: {formatDateTime(record.created_on)}</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>Updated On: {formatDateTime(record.updated_on)}</Typography>
        </CardContent>
      </Card>
    </Stack>
  );
};

const AuthorShow = () => (
  <Show>
    <AuthorShowContent />
  </Show>
);

const PublisherList = () => (
  <List perPage={25} sort={{ field: "name", order: "ASC" }}>
    <>
      <PublisherResourceIntro />
      <Datagrid rowClick="show">
        <FunctionField
          label="Brand"
          render={(record) => {
            const src = toAbsoluteUrl(record?.brand_image_url);
            return src ? (
              <Box
                component="img"
                src={src}
                alt={record?.name || "Publisher"}
                sx={{ width: 40, height: 40, objectFit: "cover", borderRadius: "50%", border: "1px solid #e5e7eb" }}
              />
            ) : (
              "-"
            );
          }}
        />
        <RaTextField source="name" />
        <RaTextField source="slug" />
        <RaTextField source="description" />
        <BooleanField source="is_featured" label="Featured" />
        <BooleanField source="is_active" label="Active" />
        <FunctionField label="Created On" render={(record) => formatDateTime(record?.created_on)} />
        <FunctionField label="Updated On" render={(record) => formatDateTime(record?.updated_on)} />
        <FunctionField
          label="Actions"
          sortable={false}
          render={(record) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <EditButton resource="inventory/publishers" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
              <ShowButton resource="inventory/publishers" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
              <DeleteButton
                resource="inventory/publishers"
                record={record}
                label={false}
                sx={{ minWidth: 0, px: 0.5 }}
              />
            </Box>
          )}
        />
      </Datagrid>
    </>
  </List>
);

const PublisherFormFields = () => (
  <Box sx={{ display: "grid", gap: 1.5 }}>
    <TextInput source="name" label="Name" fullWidth variant="outlined" validate={required("Name is required.")} />
    <TextInput source="slug" label="Slug" fullWidth variant="outlined" />
    <TextInput source="description" label="Description" fullWidth variant="outlined" multiline minRows={4} />
    <ReferenceInput
      source="brand_image_uuid"
      reference="photos"
      sort={{ field: "created_on", order: "DESC" }}
      perPage={100}
    >
      <AutocompleteInput
        label="Brand Image"
        fullWidth
        optionText={(choice) => (choice?.file_name ? `${choice.file_name} (${choice.id})` : choice?.id || "")}
      />
    </ReferenceInput>
    <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
      <BooleanInput source="is_featured" />
      <BooleanInput source="is_active" />
    </Box>
  </Box>
);

const PublisherCreate = () => (
  <Create>
    <SimpleForm defaultValues={{ is_featured: false, is_active: true }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Create Publisher</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
        Add a publisher for book inventory mapping.
      </Typography>
      <PublisherFormFields />
    </SimpleForm>
  </Create>
);

const PublisherEdit = () => (
  <Edit>
    <SimpleForm>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Edit Publisher</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>
        Update publisher details used across inventory.
      </Typography>
      <PublisherFormFields />
    </SimpleForm>
  </Edit>
);

const PublisherShowContent = () => {
  const record = useRecordContext();
  if (!record) return null;
  const brandImageSrc = toAbsoluteUrl(record?.brand_image_url);

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) auto" },
              alignItems: "start",
            }}
          >
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Box
                sx={{
                  width: 84,
                  height: 84,
                  borderRadius: "50%",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#f9fafb",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {brandImageSrc ? (
                  <Box component="img" src={brandImageSrc} alt={record.name || "Publisher"} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  "No image"
                )}
              </Box>
              <Box>
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1.15 }}>
                {record.name || "-"}
              </Typography>
              <Typography sx={{ mt: 0.75, fontSize: 14, color: "#6b7280" }}>Slug: {record.slug || "-"}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: { lg: "flex-end" } }}>
              <Box
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: record.is_active ? "#065F46" : "#991B1B",
                  backgroundColor: record.is_active ? "#ECFDF5" : "#FEF2F2",
                }}
              >
                {record.is_active ? "Active" : "Inactive"}
              </Box>
              <Box
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  color: record.is_featured ? "#075985" : "#374151",
                  backgroundColor: record.is_featured ? "#E0F2FE" : "#F3F4F6",
                }}
              >
                {record.is_featured ? "Featured" : "Not Featured"}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1 }}>Description</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151", whiteSpace: "pre-wrap" }}>
            {record.description || "-"}
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1 }}>Meta</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151", wordBreak: "break-all" }}>UUID: {record.uuid || "-"}</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151", wordBreak: "break-all" }}>
            Brand Image UUID: {record.brand_image_uuid || "-"}
          </Typography>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>Created On: {formatDateTime(record.created_on)}</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>Updated On: {formatDateTime(record.updated_on)}</Typography>
        </CardContent>
      </Card>
    </Stack>
  );
};

const PublisherShow = () => (
  <Show>
    <PublisherShowContent />
  </Show>
);

const PHOTO_UPLOAD_STATUS_CHOICES = [
  { id: "PENDING", name: "Pending" },
  { id: "UPLOADED", name: "Uploaded" },
];

const photoListFilters = [<SearchInput key="photo-search" source="q" alwaysOn placeholder="Search file, alt tag, url" />];

const PhotoThumbField = () => {
  const record = useRecordContext();
  const src = toAbsoluteUrl(record?.effective_url || record?.cdn_url || "");
  if (!src) return <Typography sx={{ fontSize: 12, color: "#6b7280" }}>No image</Typography>;
  return (
    <Box
      component="img"
      src={src}
      alt={record?.alt_tag || record?.file_name || "Photo"}
      sx={{ width: 56, height: 56, objectFit: "cover", borderRadius: 1, border: "1px solid #e5e7eb" }}
    />
  );
};

const PhotoList = () => (
  <List perPage={25} sort={{ field: "created_on", order: "DESC" }} filters={photoListFilters}>
    <>
      <PhotoResourceIntro />
      <Datagrid rowClick="show">
        <FunctionField label="Preview" render={() => <PhotoThumbField />} />
        <RaTextField source="file_name" label="File Name" />
        <RaTextField source="alt_tag" label="Alt Tag" />
        <RaTextField source="upload_status" label="Upload Status" />
        <RaTextField source="content_type" label="Content Type" />
        <FunctionField label="Size" render={(record) => formatFileSize(record?.file_size_bytes)} />
        <BooleanField source="is_active" label="Active" />
        <FunctionField label="Created On" render={(record) => formatDateTime(record?.created_on)} />
        <FunctionField label="Actions" sortable={false} render={(record) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <EditButton resource="photos" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
            <ShowButton resource="photos" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
            <DeleteButton resource="photos" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
          </Box>
        )} />
      </Datagrid>
    </>
  </List>
);

const PhotoFormFields = () => (
  <Box sx={{ display: "grid", gap: 1.5 }}>
    <ImageInput source="file" label="Upload Image" accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif"] }}>
      <ImageField source="src" title="title" />
    </ImageInput>
    <TextInput source="file_name" label="File Name" variant="outlined" fullWidth />
    <TextInput source="alt_tag" label="Alt Tag" variant="outlined" fullWidth />
    <TextInput source="cdn_url" label="CDN URL" variant="outlined" fullWidth />
    <TextInput source="storage_key" label="Storage Key" variant="outlined" fullWidth />
    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
      <TextInput source="content_type" label="Content Type (auto)" variant="outlined" fullWidth disabled />
      <NumberInput source="file_size_bytes" label="File Size (bytes, auto)" variant="outlined" fullWidth disabled />
      <SelectInput
        source="upload_status"
        label="Upload Status (auto)"
        choices={PHOTO_UPLOAD_STATUS_CHOICES}
        variant="outlined"
        fullWidth
        disabled
      />
      <NumberInput source="width" label="Width (auto)" variant="outlined" fullWidth disabled />
      <NumberInput source="height" label="Height (auto)" variant="outlined" fullWidth disabled />
      <BooleanInput source="is_active" />
    </Box>
  </Box>
);

const PhotoCreate = () => (
  <Create>
    <SimpleForm defaultValues={{ upload_status: "PENDING", is_active: true }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Create Photo</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>Add photo metadata and URLs.</Typography>
      <PhotoFormFields />
    </SimpleForm>
  </Create>
);

const PhotoEdit = () => (
  <Edit>
    <SimpleForm>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0A4A47" }}>Edit Photo</Typography>
      <Typography sx={{ mt: -0.5, mb: 0.5, color: "#4b5563" }}>Update photo metadata and status.</Typography>
      <PhotoFormFields />
    </SimpleForm>
  </Edit>
);

const PhotoShowContent = () => {
  const record = useRecordContext();
  if (!record) return null;

  const src = toAbsoluteUrl(record?.effective_url || record?.cdn_url || "");

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "280px minmax(0, 1fr)" },
              alignItems: "start",
            }}
          >
            <Box
              sx={{
                width: "100%",
                maxWidth: 280,
                height: 280,
                borderRadius: 1.5,
                border: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {src ? (
                <Box component="img" src={src} alt={record.alt_tag || record.file_name || "Photo"} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Typography sx={{ fontSize: 13, color: "#6b7280" }}>No image</Typography>
              )}
            </Box>

            <Box>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
                {record.file_name || "Photo"}
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 14, color: "#4b5563" }}>{record.alt_tag || "-"}</Typography>

              <Box sx={{ mt: 1.25, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    color: record.upload_status === "UPLOADED" ? "#065F46" : "#92400E",
                    backgroundColor: record.upload_status === "UPLOADED" ? "#ECFDF5" : "#FFFBEB",
                  }}
                >
                  {record.upload_status || "PENDING"}
                </Box>
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    color: record.is_active ? "#065F46" : "#991B1B",
                    backgroundColor: record.is_active ? "#ECFDF5" : "#FEF2F2",
                  }}
                >
                  {record.is_active ? "Active" : "Inactive"}
                </Box>
              </Box>

              <Box sx={{ mt: 1.5, display: "grid", gap: 0.75 }}>
                <Typography sx={{ fontSize: 14, color: "#374151" }}>Content Type: <Box component="span" sx={{ fontWeight: 700 }}>{record.content_type || "-"}</Box></Typography>
                <Typography sx={{ fontSize: 14, color: "#374151" }}>Size: <Box component="span" sx={{ fontWeight: 700 }}>{formatFileSize(record.file_size_bytes)}</Box></Typography>
                <Typography sx={{ fontSize: 14, color: "#374151" }}>Dimensions: <Box component="span" sx={{ fontWeight: 700 }}>{record.width ?? "-"} x {record.height ?? "-"}</Box></Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1 }}>Links</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151", wordBreak: "break-all" }}>CDN URL: {record.cdn_url || "-"}</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151", wordBreak: "break-all" }}>Effective URL: {record.effective_url || "-"}</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151", wordBreak: "break-all" }}>Storage Key: {record.storage_key || "-"}</Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827", mb: 1 }}>Meta</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151", wordBreak: "break-all" }}>UUID: {record.uuid || "-"}</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>Uploaded On: {formatDateTime(record.uploaded_on)}</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>Created On: {formatDateTime(record.created_on)}</Typography>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>Updated On: {formatDateTime(record.updated_on)}</Typography>
        </CardContent>
      </Card>
    </Stack>
  );
};

const PhotoShow = () => (
  <Show>
    <PhotoShowContent />
  </Show>
);

const PackageListCards = () => {
  const { data = [], isLoading } = useListContext();

  if (isLoading) {
    return <Typography sx={{ mt: 1.5, color: "#4b5563" }}>Loading packages...</Typography>;
  }

  if (!data.length) {
    return <Typography sx={{ mt: 1.5, color: "#4b5563" }}>No packages found.</Typography>;
  }

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {data.map((record) => (
        <Card key={record.id} sx={{ border: "1px solid #e5e7eb" }}>
          <CardContent sx={{ pb: 1 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>
              {record.package_name || "Package"}
            </Typography>
            <Typography sx={{ mt: 0.25, fontSize: 13, color: "#6b7280" }}>
              ID: {record.pk ?? "-"}
            </Typography>
            <Typography sx={{ mt: 1, fontSize: 14, color: "#374151" }}>
              {record.package_description || "-"}
            </Typography>
            <Typography sx={{ mt: 1, fontSize: 13, color: "#4b5563" }}>
              Weight: {record.weight_per_package ?? "-"} Kg
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              Dimensions: {record.package_dimension_length ?? "-"} x {record.package_dimension_breadth ?? "-"} x{" "}
              {record.package_dimension_height ?? "-"} cm
            </Typography>
          </CardContent>
          <CardActions sx={{ justifyContent: "flex-end", px: 2, pb: 1.5, pt: 0 }}>
            <EditButton resource="my/packages" record={record} />
            <DeleteButton
              resource="my/packages"
              record={record}
              mutationMode="pessimistic"
            />
          </CardActions>
        </Card>
      ))}
    </Box>
  );
};

const PackageList = () => {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("md"));

  return (
    <List
      perPage={25}
      sort={{ field: "updated_on", order: "DESC" }}
      aside={<PackageHelpfulInfoAside />}
    >
      <>
        <PackageResourceIntro />
        {isMobile ? (
          <PackageListCards />
        ) : (
          <Datagrid rowClick="show">
            <NumberField source="pk" label="ID" />
            <RaTextField source="package_name" label="Package Name" />
            <RaTextField source="package_description" label="Package Contains" />
            <NumberField source="weight_per_package" label="Weight (Kg)" />
            <NumberField source="package_dimension_length" label="Length (CM)" />
            <NumberField source="package_dimension_breadth" label="Breadth (CM)" />
            <NumberField source="package_dimension_height" label="Height (CM)" />
            <FunctionField
              label="Actions"
              sortable={false}
              render={(record) => (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                  <EditButton resource="my/packages" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
                  <ShowButton resource="my/packages" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
                  <DeleteButton resource="my/packages" record={record} label={false} sx={{ minWidth: 0, px: 0.5 }} />
                </Box>
              )}
            />
          </Datagrid>
        )}
      </>
    </List>
  );
};

const PackageCreateToolbar = (props) => (
  <Toolbar {...props}>
    <SaveButton />
  </Toolbar>
);

const PackageCreate = () => {
  const provider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();

  const handleSubmit = async (values) => {
    const packageCount = Math.max(1, Number(values.package_count || 1));
    const payload = { ...values };
    delete payload.package_count;
    try {
      for (let index = 0; index < packageCount; index += 1) {
        await provider.create("my/packages", {
          data: payload,
        });
      }

      notify(
        packageCount > 1
          ? `${packageCount} package records created.`
          : "Package created successfully.",
        { type: "success" }
      );
      redirect("list", "my/packages");
    } catch (error) {
      notify(
        firstErrorMessage(
          error?.body,
          error?.message || "Unable to create package."
        ),
        { type: "error" }
      );
    }
  };

  return (
    <Create aside={<PackageHelpfulInfoAside />}>
      <SimpleForm onSubmit={handleSubmit} toolbar={<PackageCreateToolbar />}>
        <PackageResourceIntro />
        <TextInput
          source="package_name"
          label="Package Name"
          variant="outlined"
          fullWidth
        />
        <TextInput
          source="package_description"
          label="Package Contains"
          variant="outlined"
          fullWidth
        />
        <NumberInput
          source="weight_per_package"
          label="Weight in Kg"
          variant="outlined"
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 1.5,
          }}
        >
          <NumberInput
            source="package_dimension_length"
            label="Length (CM)"
            variant="outlined"
            fullWidth
          />
          <NumberInput
            source="package_dimension_breadth"
            label="Breadth (CM)"
            variant="outlined"
            fullWidth
          />
          <NumberInput
            source="package_dimension_height"
            label="Height (CM)"
            variant="outlined"
            fullWidth
          />
        </Box>
        <NumberInput
          source="package_count"
          label="No. of packages in the given dimensions"
          defaultValue={1}
          min={1}
          variant="outlined"
        />
      </SimpleForm>
    </Create>
  );
};

const PackageEdit = () => (
  <Edit aside={<PackageHelpfulInfoAside />}>
    <SimpleForm>
      <PackageResourceIntro />
      <TextInput
        source="package_name"
        label="Package Name"
        variant="outlined"
        fullWidth
      />
      <TextInput
        source="package_description"
        label="Package Contains"
        variant="outlined"
        fullWidth
      />
      <NumberInput
        source="weight_per_package"
        label="Weight in Kg"
        variant="outlined"
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 1.5,
        }}
      >
        <NumberInput
          source="package_dimension_length"
          label="Length (CM)"
          variant="outlined"
          fullWidth
        />
        <NumberInput
          source="package_dimension_breadth"
          label="Breadth (CM)"
          variant="outlined"
          fullWidth
        />
        <NumberInput
          source="package_dimension_height"
          label="Height (CM)"
          variant="outlined"
          fullWidth
        />
      </Box>
      <BooleanInput source="is_active" />
    </SimpleForm>
  </Edit>
);

const PackageShowField = ({ label, children }) => (
  <Box>
    <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
      {label}
    </Typography>
    <Typography sx={{ mt: 0.25, fontSize: 16, color: "#111827" }}>
      {children}
    </Typography>
  </Box>
);

const PackageShow = () => (
  <Show aside={<PackageHelpfulInfoAside />}>
    <SimpleShowLayout>
      <Box sx={{ width: "100%", maxWidth: 980 }}>
        <PackageResourceIntro />

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827", mb: 1.5 }}>
              Overview
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
              }}
            >
              <PackageShowField label="ID">
                <NumberField source="pk" />
              </PackageShowField>
              <PackageShowField label="Package Name">
                <RaTextField source="package_name" />
              </PackageShowField>
              <PackageShowField label="Contains">
                <RaTextField source="package_description" />
              </PackageShowField>
              <PackageShowField label="Weight (Kg)">
                <NumberField source="weight_per_package" />
              </PackageShowField>
              <PackageShowField label="Active">
                <BooleanField source="is_active" />
              </PackageShowField>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827", mb: 1.5 }}>
              Dimensions
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
              }}
            >
              <PackageShowField label="Length (CM)">
                <NumberField source="package_dimension_length" />
              </PackageShowField>
              <PackageShowField label="Breadth (CM)">
                <NumberField source="package_dimension_breadth" />
              </PackageShowField>
              <PackageShowField label="Height (CM)">
                <NumberField source="package_dimension_height" />
              </PackageShowField>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827", mb: 1.5 }}>
              Additional
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              }}
            >
              <PackageShowField label="Quantity">
                <NumberField source="quantity" />
              </PackageShowField>
              <PackageShowField label="Pickup ID">
                <NumberField source="pickup" />
              </PackageShowField>
              <PackageShowField label="Category">
                <RaTextField source="package_category" />
              </PackageShowField>
              <PackageShowField label="HSN Code">
                <RaTextField source="hsn_code" />
              </PackageShowField>
              <PackageShowField label="AWB Number">
                <RaTextField source="awb_number" />
              </PackageShowField>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827", mb: 1.5 }}>
              Audit
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              }}
            >
              <PackageShowField label="Created On">
                <FunctionField render={(record) => formatDateTime(record?.created_on)} />
              </PackageShowField>
              <PackageShowField label="Updated On">
                <FunctionField render={(record) => formatDateTime(record?.updated_on)} />
              </PackageShowField>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </SimpleShowLayout>
  </Show>
);

const PickupRequestListCards = () => {
  const { data = [], isLoading } = useListContext();

  if (isLoading) {
    return (
      <Typography sx={{ mt: 1.5, color: "#4b5563" }}>
        Loading pickup requests...
      </Typography>
    );
  }

  if (!data.length) {
    return (
      <Typography sx={{ mt: 1.5, color: "#4b5563" }}>
        No pickup requests found.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {data.map((record) => (
        <Card key={record.id} sx={{ border: "1px solid #e5e7eb" }}>
          <CardContent sx={{ pb: 1 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>
              Pickup Request
            </Typography>
            <Typography sx={{ mt: 0.25, fontSize: 13, color: "#6b7280" }}>
              ID: {record.pk ?? "-"}
            </Typography>
            <Typography sx={{ mt: 1, fontSize: 13, color: "#4b5563" }}>
              <strong>From:</strong> {record.from_address_display || "-"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>From Pincode:</strong>{" "}
              {record?.from_address?.pincode ||
                record?.from_pincode ||
                record?.from_address_pincode ||
                parsePincodeFromAddress(record?.from_address_display) ||
                "-"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>To:</strong> {record.to_address_display || "-"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>Scheduled:</strong> {record.pickup_scheduled_date || "-"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>Packages:</strong> {record.no_of_packages ?? 0}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>Total Weight:</strong> {record.total_weight ?? "-"} Kg
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>Status:</strong> {record.pickup_status || "-"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
              <strong>Pickup Instruction:</strong> {record.pickup_instruction || "-"}
            </Typography>
            {record.reason_for_cancellation ? (
              <Typography sx={{ mt: 0.5, fontSize: 13, color: "#7f1d1d" }}>
                <strong>Reason for Cancellation:</strong> {record.reason_for_cancellation}
              </Typography>
            ) : null}
          </CardContent>
          <CardActions sx={{ justifyContent: "flex-end", px: 2, pb: 1.5, pt: 0 }}>
            <ShowButton resource="my/pickup-requests" record={record} label={false} />
            <EditButton resource="my/pickup-requests" record={record} label={false} />
            <DeleteButton
              resource="my/pickup-requests"
              record={record}
              mutationMode="pessimistic"
              label={false}
            />
          </CardActions>
        </Card>
      ))}
    </Box>
  );
};

const PickupRequestList = () => {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("md"));

  return (
    <List
      perPage={25}
      sort={{ field: "updated_on", order: "DESC" }}
      aside={<PickupRequestHelpfulInfoAside />}
    >
      <>
        <PickupRequestResourceIntro />
        {isMobile ? (
          <PickupRequestListCards />
        ) : (
          <Datagrid rowClick="show">
            <NumberField source="pk" label="ID" />
            <RaTextField source="from_address_display" label="From Address" />
            <FunctionField
              label="From Pincode"
              render={(record) =>
                record?.from_address?.pincode ||
                record?.from_pincode ||
                record?.from_address_pincode ||
                parsePincodeFromAddress(record?.from_address_display) ||
                "-"
              }
            />
            <RaTextField source="to_address_display" label="To Address" />
            <RaTextField source="pickup_scheduled_date" label="Scheduled Date" />
            <NumberField source="no_of_packages" />
            <RaTextField source="pickup_status" />
            <FunctionField
              label="Actions"
              sortable={false}
              render={(record) => (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                  <EditButton
                    resource="my/pickup-requests"
                    record={record}
                    label={false}
                    sx={{ minWidth: 0, px: 0.5 }}
                  />
                  <ShowButton
                    resource="my/pickup-requests"
                    record={record}
                    label={false}
                    sx={{ minWidth: 0, px: 0.5 }}
                  />
                  <DeleteButton
                    resource="my/pickup-requests"
                    record={record}
                    label={false}
                    sx={{ minWidth: 0, px: 0.5 }}
                  />
                </Box>
              )}
            />
          </Datagrid>
        )}
      </>
    </List>
  );
};

const pickupAddressOptionText = (address) => {
  if (!address) return "";
  return [
    address.address_name,
    address.full_name,
    address.building_name,
    address.area_sector,
    address.town_city,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");
};

const parsePincodeFromAddress = (addressDisplay) => {
  const text = String(addressDisplay || "");
  const match = text.match(/(\d{6})(?:\D*$)/);
  return match ? match[1] : "";
};

const pickupPackageOptionText = (pkg) => {
  if (!pkg) return "";
  return [pkg.package_name, pkg.package_description].filter(Boolean).join(" - ");
};

const usePickupFormChoices = () => {
  const { data: addresses = [] } = useGetList("my/address", {
    filter: {},
    pagination: { page: 1, perPage: 200 },
    sort: { field: "created_on", order: "DESC" },
  });

  const { data: packages = [] } = useGetList("my/packages", {
    filter: {},
    pagination: { page: 1, perPage: 200 },
    sort: { field: "created_on", order: "DESC" },
  });

  return { addresses, packages };
};

const PickupRequestCreate = () => {
  const { addresses, packages } = usePickupFormChoices();
  const notify = useNotify();

  return (
    <Create
      aside={<PickupRequestHelpfulInfoAside />}
      mutationOptions={{
        onError: (error) => {
          const fieldErrors = normalizeFieldErrors(error?.body);
          const lines = Object.entries(fieldErrors)
            .filter(([, messages]) => Array.isArray(messages) && messages.length)
            .map(([field, messages]) => `${field}: ${messages[0]}`);

          notify(
            lines.length
              ? lines.join(" | ")
              : firstErrorMessage(
                  error?.body,
                  error?.message || "Unable to create pickup request."
                ),
            { type: "error" }
          );
        },
      }}
    >
      <SimpleForm>
        <PickupRequestResourceIntro />
        <SelectInput
          source="from_address"
          label="From Address"
          choices={addresses}
          optionText={pickupAddressOptionText}
          optionValue="pk"
          validate={required("From address is required.")}
          variant="outlined"
          fullWidth
        />
        <DateInput
          source="pickup_scheduled_date"
          label="Pickup Scheduled Date"
          validate={required("Pickup scheduled date is required.")}
          variant="outlined"
        />
        <SelectArrayInput
          source="packages"
          label="Packages"
          choices={packages}
          optionText={pickupPackageOptionText}
          optionValue="pk"
          validate={required("Select at least one package.")}
          variant="outlined"
          fullWidth
        />
        <SelectInput
          source="pickup_status"
          choices={PICKUP_STATUS_CHOICES}
          variant="outlined"
        />
        <TextInput source="pickup_instruction" variant="outlined" fullWidth />
        <FormDataConsumer>
          {({ formData }) =>
            formData?.pickup_status === "REQUEST_CANCEL" ? (
              <TextInput
                source="reason_for_cancellation"
                variant="outlined"
                fullWidth
              />
            ) : null
          }
        </FormDataConsumer>
      </SimpleForm>
    </Create>
  );
};

const PickupRequestEdit = () => {
  const { addresses, packages } = usePickupFormChoices();
  const notify = useNotify();

  return (
    <Edit
      aside={<PickupRequestHelpfulInfoAside />}
      mutationOptions={{
        onError: (error) => {
          const fieldErrors = normalizeFieldErrors(error?.body);
          const lines = Object.entries(fieldErrors)
            .filter(([, messages]) => Array.isArray(messages) && messages.length)
            .map(([field, messages]) => `${field}: ${messages[0]}`);

          notify(
            lines.length
              ? lines.join(" | ")
              : firstErrorMessage(
                  error?.body,
                  error?.message || "Unable to update pickup request."
                ),
            { type: "error" }
          );
        },
      }}
    >
      <SimpleForm>
        <PickupRequestResourceIntro />
        <SelectInput
          source="from_address"
          label="From Address"
          choices={addresses}
          optionText={pickupAddressOptionText}
          optionValue="pk"
          validate={required("From address is required.")}
          variant="outlined"
          fullWidth
        />
        <DateInput
          source="pickup_scheduled_date"
          label="Pickup Scheduled Date"
          validate={required("Pickup scheduled date is required.")}
          variant="outlined"
        />
        <SelectArrayInput
          source="packages"
          label="Packages"
          choices={packages}
          optionText={pickupPackageOptionText}
          optionValue="pk"
          validate={required("Select at least one package.")}
          variant="outlined"
          fullWidth
        />
        <SelectInput
          source="pickup_status"
          choices={PICKUP_STATUS_CHOICES}
          variant="outlined"
        />
        <TextInput source="pickup_instruction" variant="outlined" fullWidth />
        <FormDataConsumer>
          {({ formData }) =>
            formData?.pickup_status === "REQUEST_CANCEL" ? (
              <TextInput
                source="reason_for_cancellation"
                variant="outlined"
                fullWidth
              />
            ) : null
          }
        </FormDataConsumer>
        <BooleanInput source="is_active" />
      </SimpleForm>
    </Edit>
  );
};

const PickupShowField = ({ label, children }) => (
  <Box>
    <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
      {label}
    </Typography>
    <Typography sx={{ mt: 0.25, fontSize: 16, color: "#111827" }}>
      {children}
    </Typography>
  </Box>
);

const PickupShippingLabelActions = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const [loadingType, setLoadingType] = React.useState("");
  const [paperSize, setPaperSize] = React.useState("a4");

  const openLabels = async (labelType) => {
    if (!record?.id) return;

    const popup = window.open("", "_blank");
    if (popup) {
      popup.document.title = "Generating Shipping Labels";
      popup.document.body.innerHTML =
        "<p style='font-family:Arial,sans-serif;padding:16px;'>Generating shipping labels...</p>";
    }

    setLoadingType(labelType);
    try {
      const token = getStoredToken();
      const response = await fetch(
        `${API_BASE_URL}/logistics/pickup-requests/${record.id}/shipping-labels/?type=${labelType}&paper=${paperSize}`,
        {
          method: "GET",
          headers: {
            Accept: "text/html,application/json",
            ...(token ? { Authorization: `Token ${token}` } : {}),
          },
        }
      );

      const contentType = response.headers.get("content-type") || "";
      const payload = await response.text();

      if (!response.ok) {
        let errorMessage = `Unable to generate shipping labels (${response.status}).`;
        if (contentType.includes("application/json")) {
          try {
            const parsed = JSON.parse(payload);
            errorMessage = firstErrorMessage(parsed, errorMessage);
          } catch {
            // Keep fallback error message if parsing fails.
          }
        } else if (payload?.trim()) {
          errorMessage = payload.trim().slice(0, 180);
        }
        if (popup) popup.close();
        throw new Error(errorMessage);
      }

      const blob = new Blob([payload], { type: "text/html;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      if (popup) {
        popup.location.href = objectUrl;
      } else {
        const fallback = window.open(objectUrl, "_blank", "noopener,noreferrer");
        if (!fallback) {
          notify("Enable popups to open the printable shipping labels.", {
            type: "warning",
          });
        }
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120000);
    } catch (error) {
      if (popup && !popup.closed) popup.close();
      notify(error?.message || "Unable to generate shipping labels.", {
        type: "error",
      });
    } finally {
      setLoadingType("");
    }
  };

  if (!canShowShippingLabelDownload(record?.pickup_status)) {
    return null;
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#0A4A47", mb: 0.75 }}>
        Paper Size
      </Typography>
      <RadioGroup
        row
        value={paperSize}
        onChange={(event) => setPaperSize(event.target.value)}
      >
        <FormControlLabel
          value="a4"
          control={<Radio size="small" disabled={Boolean(loadingType)} />}
          label="A4"
        />
        <FormControlLabel
          value="4x6"
          control={<Radio size="small" disabled={Boolean(loadingType)} />}
          label="4x6 Thermal"
        />
      </RadioGroup>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
        <Button
          variant="contained"
          onClick={() => openLabels("all")}
          disabled={Boolean(loadingType)}
        >
          {loadingType === "all" ? "Generating..." : "Download All Labels"}
        </Button>
        <Button
          variant="outlined"
          onClick={() => openLabels("summary")}
          disabled={Boolean(loadingType)}
        >
          {loadingType === "summary" ? "Generating..." : "Download Summary"}
        </Button>
        <Button
          variant="outlined"
          onClick={() => openLabels("individual")}
          disabled={Boolean(loadingType)}
        >
          {loadingType === "individual" ? "Generating..." : "Download Package Labels"}
        </Button>
      </Stack>
    </Box>
  );
};

const PickupShippingLabelSection = () => {
  const record = useRecordContext();

  if (!canShowShippingLabelDownload(record?.pickup_status)) {
    return null;
  }

  return (
    <Card sx={{ mb: 2, border: "1px solid #d1fae5", backgroundColor: "#f0fdf4" }}>
      <CardContent>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#0A4A47" }}>
          Shipping Labels
        </Typography>
        <Typography sx={{ mt: 0.5, color: "#374151" }}>
          Choose paper size and download one summary label with all packages or individual package labels.
        </Typography>
        <PickupShippingLabelActions />
      </CardContent>
    </Card>
  );
};

const PickupRequestShow = () => (
  <Show aside={<PickupRequestHelpfulInfoAside />}>
    <SimpleShowLayout>
      <Box sx={{ width: "100%", maxWidth: 980 }}>
        <PickupRequestResourceIntro />

        <PickupShippingLabelSection />

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827", mb: 1.5 }}>
              Request Summary
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
              }}
            >
              <PickupShowField label="Scheduled Date">
                <RaTextField source="pickup_scheduled_date" />
              </PickupShowField>
              <PickupShowField label="Status">
                <RaTextField source="pickup_status" />
              </PickupShowField>
              <PickupShowField label="No. of Packages">
                <NumberField source="no_of_packages" />
              </PickupShowField>
              <PickupShowField label="From Address">
                <RaTextField source="from_address_display" />
              </PickupShowField>
              <PickupShowField label="To Address">
                <RaTextField source="to_address_display" />
              </PickupShowField>
              <PickupShowField label="Active">
                <BooleanField source="is_active" />
              </PickupShowField>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827", mb: 1.5 }}>
              Notes
            </Typography>
            <Box sx={{ display: "grid", gap: 2 }}>
              <PickupShowField label="Pickup Instruction">
                <RaTextField source="pickup_instruction" />
              </PickupShowField>
              <PickupShowField label="Reason for Cancellation">
                <RaTextField source="reason_for_cancellation" />
              </PickupShowField>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827", mb: 1.5 }}>
              Audit
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              }}
            >
              <PickupShowField label="Created On">
                <FunctionField render={(record) => formatDateTime(record?.created_on)} />
              </PickupShowField>
              <PickupShowField label="Updated On">
                <FunctionField render={(record) => formatDateTime(record?.updated_on)} />
              </PickupShowField>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </SimpleShowLayout>
  </Show>
);

const TroubleWithSignup = ({ text }) => (
  <Box
    sx={{
      mt: 1.5,
      display: "flex",
      alignItems: "center",
      gap: 0.75,
      color: "#374151",
      fontSize: 13,
    }}
  >
    <HelpOutlineOutlinedIcon sx={{ fontSize: 16, color: "#0A4A47" }} />
    <Typography sx={{ fontSize: 13, color: "inherit" }}>
      {text} Visit{" "}
      <Button
        component="a"
        href="https://help.putforshare.com"
        target="_blank"
        rel="noreferrer"
        sx={{ p: 0, minWidth: 0, textTransform: "none" }}
      >
        Help
      </Button>
    </Typography>
  </Box>
);

const UNVERIFIED_LOGIN_ERROR = "Email not verified. Check your inbox.";

const LoginPage = () => {
  const login = useLogin();
  const notify = useNotify();
  const navigate = useNavigate();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [globalError, setGlobalError] = React.useState("");
  const [resendState, setResendState] = React.useState({ status: "idle", message: "" });

  React.useEffect(() => {
    document.title = "PutForShare - Login";
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setGlobalError("");
    setResendState({ status: "idle", message: "" });
    setIsSubmitting(true);

    try {
      await login({ email, password });
      const currentUser = getStoredUser();
      navigate(currentUser?.pfs_role === "ADMIN" ? "/admin" : "/my", {
        replace: true,
      });
      notify("Login successful", { type: "success" });
    } catch (error) {
      setGlobalError(error?.message || "Login failed.");
      notify(error?.message || "Login failed.", { type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResendState({ status: "loading", message: "" });
    try {
      const payload = await requestApi("/auth/verify-email/resend/", {
        method: "POST",
        auth: false,
        body: { email },
      });
      setResendState({
        status: "success",
        message:
          payload?.detail ||
          "If a pending verification exists for that email, a new link was sent.",
      });
    } catch (error) {
      const msg = firstErrorMessage(
        error?.body,
        error?.message || "Unable to resend verification email."
      );
      setResendState({ status: "error", message: msg });
    }
  };

  const showResendCta = globalError === UNVERIFIED_LOGIN_ERROR && Boolean(email);
  return (
    <AuthShell
      title="Nice to See You Again"
      subtitle="Login with your email and password"
    >
      {globalError ? <Alert severity="error">{globalError}</Alert> : null}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={1.5}>
          <TextField
            variant="outlined"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            fullWidth
          />
          <TextField
            variant="outlined"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {showResendCta ? (
            <Alert
              severity="info"
              action={
                <Button
                  size="small"
                  onClick={handleResend}
                  disabled={resendState.status === "loading"}
                >
                  {resendState.status === "loading" ? "Sending…" : "Resend"}
                </Button>
              }
            >
              Didn't get the link? We can send a new one to <strong>{email}</strong>.
            </Alert>
          ) : null}
          {resendState.status === "success" ? (
            <Alert severity="success">{resendState.message}</Alert>
          ) : null}
          {resendState.status === "error" ? (
            <Alert severity="error">{resendState.message}</Alert>
          ) : null}
          <Button component={RouterLink} to="/forgot-password" size="small">
            Forgot password?
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            fullWidth
          >
            Login
          </Button>
          <Button
            component={RouterLink}
            to="/earning-calculator"
            variant="outlined"
            fullWidth
            target="_blank"
            rel="noreferrer"
          >
            Try Earning Calculator
          </Button>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>
            New here?{" "}
            <Button
              component={RouterLink}
              to="/signup"
              sx={{ p: 0, minWidth: 0 }}
            >
              Create Account
            </Button>
          </Typography>
          <TroubleWithSignup text="Trouble with login ?" />
        </Stack>
      </Box>
    </AuthShell>
  );
};

const SignupPage = () => {
  const notify = useNotify();

  const [email, setEmail] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [acceptTerms, setAcceptTerms] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [globalError, setGlobalError] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [submitted, setSubmitted] = React.useState(false);
  const [resendState, setResendState] = React.useState({ status: "idle", message: "" });

  React.useEffect(() => {
    document.title = "PutForShare - Signup";
  }, []);

  const onUsernameChange = (value) => {
    const clean = value
      .replace(/@/g, "")
      .replace(/[^a-zA-Z0-9_.]/g, "")
      .toLowerCase();
    setUsername(clean);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setGlobalError("");
    setFieldErrors({});

    if (!acceptTerms) {
      setGlobalError("Please accept the Terms of Service.");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestApi("/auth/signup/", {
        method: "POST",
        auth: false,
        body: {
          email,
          username,
          full_name: fullName,
          password,
        },
      });

      setSubmitted(true);
      notify("Account created. Check your email to verify.", { type: "success" });
    } catch (error) {
      const apiErrors = normalizeFieldErrors(error?.body);
      setFieldErrors(apiErrors);
      setGlobalError(
        firstErrorMessage(error?.body, error?.message || "Signup failed.")
      );
      notify(firstErrorMessage(error?.body, "Signup failed."), {
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResendState({ status: "loading", message: "" });
    try {
      const payload = await requestApi("/auth/verify-email/resend/", {
        method: "POST",
        auth: false,
        body: { email },
      });
      setResendState({
        status: "success",
        message:
          payload?.detail ||
          "If a pending verification exists for that email, a new link was sent.",
      });
    } catch (error) {
      const msg = firstErrorMessage(
        error?.body,
        error?.message || "Unable to resend verification email."
      );
      setResendState({ status: "error", message: msg });
    }
  };

  if (submitted) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle="One last step to activate your account"
        backgroundSx="linear-gradient(180deg, #f3f9f9 0%, #ffffff 100%)"
        cardSx={{
          border: "1px solid #d8e6e6",
          backgroundColor: "#ffffff",
          boxShadow: "0 16px 40px rgba(0,112,115,0.08)",
        }}
      >
        <Stack spacing={1.5}>
          <Alert severity="success">
            We sent a verification link to <strong>{email}</strong>. Click the link to activate your
            account, then sign in.
          </Alert>
          <Typography sx={{ fontSize: 14, color: "#374151" }}>
            The link expires in 24 hours. If you don't see it, check spam — or resend below.
          </Typography>
          {resendState.status === "success" ? (
            <Alert severity="success">{resendState.message}</Alert>
          ) : null}
          {resendState.status === "error" ? (
            <Alert severity="error">{resendState.message}</Alert>
          ) : null}
          <Button
            type="button"
            variant="outlined"
            onClick={handleResend}
            disabled={resendState.status === "loading"}
          >
            {resendState.status === "loading" ? "Sending…" : "Resend verification email"}
          </Button>
          <Button component={RouterLink} to="/login" variant="contained">
            Back to Login
          </Button>
        </Stack>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create Account"
      subtitle="Start sharing books and earning"
      backgroundSx="linear-gradient(180deg, #f3f9f9 0%, #ffffff 100%)"
      cardSx={{
        border: "1px solid #d8e6e6",
        backgroundColor: "#ffffff",
        boxShadow: "0 16px 40px rgba(0,112,115,0.08)",
      }}
    >
      {globalError ? (
        <Alert
          severity="error"
          sx={{
            borderColor: "#d8e6e6",
            backgroundColor: "#fff1ec",
            color: "#731d00",
            "& .MuiAlert-icon": { color: "#731d00" },
          }}
        >
          {globalError}
        </Alert>
      ) : null}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={1.5}>
          <TextField
            variant="outlined"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={Boolean(fieldErrors.email?.[0])}
            helperText={fieldErrors.email?.[0] || ""}
            required
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#f3f9f9",
              },
              "& .MuiInputLabel-root.Mui-focused": { color: "#007073" },
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                { borderColor: "#007073" },
            }}
          />

          <TextField
            variant="outlined"
            label="Username"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            error={Boolean(fieldErrors.username?.[0])}
            helperText={fieldErrors.username?.[0] || ""}
            required
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">@</InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    size="small"
                    onClick={() => setUsername(generateUsername())}
                  >
                    Generate
                  </Button>
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#f3f9f9",
              },
              "& .MuiInputLabel-root.Mui-focused": { color: "#007073" },
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                { borderColor: "#007073" },
            }}
          />

          <TextField
            variant="outlined"
            label="Full Name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            error={Boolean(
              fieldErrors.full_name?.[0] || fieldErrors.fullName?.[0]
            )}
            helperText={
              fieldErrors.full_name?.[0] || fieldErrors.fullName?.[0] || ""
            }
            required
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#f3f9f9",
              },
              "& .MuiInputLabel-root.Mui-focused": { color: "#007073" },
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                { borderColor: "#007073" },
            }}
          />

          <TextField
            variant="outlined"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={Boolean(fieldErrors.password?.[0])}
            helperText={fieldErrors.password?.[0] || ""}
            required
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#f3f9f9",
              },
              "& .MuiInputLabel-root.Mui-focused": { color: "#007073" },
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                { borderColor: "#007073" },
            }}
          />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={acceptTerms}
                  onChange={(event) => setAcceptTerms(event.target.checked)}
                />
              }
              label="Accept Terms"
              sx={{ ml: -1 }}
            />
              <Button
                component="a"
                href="https://putforshare.com/terms-of-service.php"
                target="_blank"
                rel="noreferrer"
                size="small"
                sx={{ color: "#007073" }}
              >
                Terms of Service
              </Button>
            </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography sx={{ fontSize: 14, color: "#374151" }}>
              Already have an account?
            </Typography>
            <Button component={RouterLink} to="/login" size="small" sx={{ color: "#007073" }}>
              Login
            </Button>
          </Box>

          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{
              backgroundColor: "#007073",
              "&:hover": { backgroundColor: "#005d60" },
            }}
          >
            Signup Now
          </Button>
          <Button
            component={RouterLink}
            to="/earning-calculator"
            variant="outlined"
            fullWidth
            target="_blank"
            rel="noreferrer"
            sx={{
              borderColor: "#007073",
              color: "#007073",
              "&:hover": {
                borderColor: "#005d60",
                backgroundColor: "#f3f9f9",
              },
            }}
          >
            Try Earning Calculator
          </Button>
          <TroubleWithSignup text="Trouble with signup ?" />
        </Stack>
      </Box>
    </AuthShell>
  );
};

const ForgotPasswordPage = () => {
  const notify = useNotify();

  const [email, setEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [globalError, setGlobalError] = React.useState("");

  React.useEffect(() => {
    document.title = "PutForShare - Forgot Password";
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setGlobalError("");
    setIsSubmitting(true);

    try {
      const payload = await requestApi("/auth/password-reset/request/", {
        method: "POST",
        auth: false,
        body: { email },
      });
      setMessage(
        payload?.detail || "Reset instructions were sent if the account exists."
      );
      notify(payload?.detail || "Reset instructions sent.", {
        type: "success",
      });
    } catch (error) {
      const msg = firstErrorMessage(
        error?.body,
        error?.message || "Unable to initiate reset."
      );
      setGlobalError(msg);
      notify(msg, { type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Forgot Password"
      subtitle="Enter your email to receive reset instructions"
    >
      {message ? <Alert severity="success">{message}</Alert> : null}
      {globalError ? <Alert severity="error">{globalError}</Alert> : null}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={1.5}>
          <TextField
            variant="outlined"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Send Reset Link
          </Button>
          <Button component={RouterLink} to="/login">
            Back to Login
          </Button>
          <TroubleWithSignup text="Trouble resetting password ?" />
        </Stack>
      </Box>
    </AuthShell>
  );
};

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const notify = useNotify();

  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [globalError, setGlobalError] = React.useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setGlobalError("");

    if (!token) {
      setGlobalError("Reset link is missing or invalid. Request a new one.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setGlobalError("New password and confirm password must match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = await requestApi("/auth/password-reset/confirm/", {
        method: "POST",
        auth: false,
        body: {
          token,
          password: newPassword,
        },
      });
      notify(payload?.detail || "Password reset successful.", {
        type: "success",
      });
      navigate("/login");
    } catch (error) {
      const msg = firstErrorMessage(
        error?.body,
        error?.message || "Password reset failed."
      );
      setGlobalError(msg);
      notify(msg, { type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Use the email link details to reset your password"
    >
      {globalError ? <Alert severity="error">{globalError}</Alert> : null}
      {!token ? (
        <Alert severity="warning">
          This reset link is missing required information. Please request a new
          password reset email.
        </Alert>
      ) : null}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={1.5}>
          <TextField
            variant="outlined"
            label="New Password"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    aria-label="toggle new password visibility"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            variant="outlined"
            label="Confirm New Password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    aria-label="toggle confirm password visibility"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                  >
                    {showConfirmPassword ? (
                      <VisibilityOffIcon />
                    ) : (
                      <VisibilityIcon />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !token}
          >
            Reset Password
          </Button>
          <Button component={RouterLink} to="/login">
            Back to Login
          </Button>
          <TroubleWithSignup text="Trouble resetting password ?" />
        </Stack>
      </Box>
    </AuthShell>
  );
};

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [state, setState] = React.useState({ status: "loading", message: "" });
  const ranRef = React.useRef(false);

  React.useEffect(() => {
    document.title = "PutForShare - Verify Email";
  }, []);

  React.useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (!token) {
      setState({
        status: "error",
        message: "Verification link is missing or invalid. Sign up again or request a new link.",
      });
      return;
    }

    requestApi("/auth/verify-email/", {
      method: "POST",
      auth: false,
      body: { token },
    })
      .then((payload) => {
        setState({
          status: "success",
          message: payload?.detail || "Email verified. You can now log in.",
        });
      })
      .catch((error) => {
        const msg = firstErrorMessage(
          error?.body,
          error?.message || "Verification failed."
        );
        setState({ status: "error", message: msg });
      });
  }, [token]);

  const subtitle =
    state.status === "loading"
      ? "Confirming your email…"
      : state.status === "success"
      ? "Welcome to PutForShare"
      : "Something went wrong";

  return (
    <AuthShell title="Verify Email" subtitle={subtitle}>
      <Stack spacing={1.5}>
        {state.status === "loading" ? (
          <Alert severity="info">Please wait while we verify your email…</Alert>
        ) : null}
        {state.status === "success" ? (
          <>
            <Alert severity="success">{state.message}</Alert>
            <Button component={RouterLink} to="/login" variant="contained">
              Go to Login
            </Button>
          </>
        ) : null}
        {state.status === "error" ? (
          <>
            <Alert severity="error">{state.message}</Alert>
            <Button component={RouterLink} to="/login">
              Back to Login
            </Button>
            <Button component={RouterLink} to="/signup">
              Sign up again
            </Button>
          </>
        ) : null}
      </Stack>
    </AuthShell>
  );
};

const ChangePasswordPage = () => {
  const notify = useNotify();
  const redirect = useRedirect();

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [globalError, setGlobalError] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setGlobalError("");
    setSuccessMessage("");

    if (newPassword !== confirmPassword) {
      setGlobalError("New password and confirm password must match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = await requestApi("/auth/change-password/", {
        method: "POST",
        body: {
          current_password: currentPassword,
          new_password: newPassword,
        },
      });
      const detail = payload?.detail || "Password updated successfully.";
      setSuccessMessage(detail);
      notify(detail, { type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const msg = firstErrorMessage(
        error?.body,
        error?.message || "Unable to change password."
      );
      setGlobalError(msg);
      notify(msg, { type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 620 }}>
      <Typography
        component="h1"
        sx={{ fontSize: 28, fontWeight: 700, color: "#0A4A47" }}
      >
        Change Password
      </Typography>
      <Typography sx={{ mt: 0.5, mb: 2, color: "#4b5563" }}>
        Keep your account secure by updating your password.
      </Typography>
      {globalError ? (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {globalError}
        </Alert>
      ) : null}
      {successMessage ? (
        <Alert severity="success" sx={{ mb: 1.5 }}>
          {successMessage}
        </Alert>
      ) : null}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={1.5}>
          <TextField
            variant="outlined"
            label="Current Password"
            type={showPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            fullWidth
          />
          <TextField
            variant="outlined"
            label="New Password"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            fullWidth
          />
          <TextField
            variant="outlined"
            label="Confirm New Password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button onClick={() => redirect("/")}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Update Password
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

const EditMyProfilePage = () => {
  const notify = useNotify();
  const redirect = useRedirect();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [globalError, setGlobalError] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [formValues, setFormValues] = React.useState({
    email: "",
    username: "",
    pfs_role: "",
    full_name: "",
    mobile: "",
    favourite_book: "",
    profile_image_uuid: "",
    upi_id: "",
    mobile_verified: false,
    upi_verified: false,
    plan: "SMART_SELL",
    plan_locked: false,
  });

  const setUserForm = React.useCallback((user) => {
    setFormValues({
      email: user?.email || "",
      username: user?.username || "",
      pfs_role: user?.pfs_role || "",
      full_name: user?.full_name || "",
      mobile: user?.mobile || "",
      favourite_book: user?.favourite_book || "",
      profile_image_uuid: user?.profile_image_uuid || "",
      upi_id: user?.upi_id || "",
      mobile_verified: Boolean(user?.mobile_verified),
      upi_verified: Boolean(user?.upi_verified),
      plan: user?.plan || "SMART_SELL",
      plan_locked: Boolean(user?.plan_locked),
    });
  }, []);

  React.useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setGlobalError("");
      try {
        const payload = await requestApi("/auth/me/");
        if (!mounted) return;
        setUserForm(payload?.user || {});
      } catch (error) {
        if (!mounted) return;
        const msg = firstErrorMessage(
          error?.body,
          error?.message || "Unable to load profile."
        );
        setGlobalError(msg);
        notify(msg, { type: "error" });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [notify, setUserForm]);

  const handleChange = (field) => (event) => {
    setFormValues((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleGenerateUsername = () => {
    const generatedUsername = generateCoolPlantUsername();
    setFormValues((current) => ({ ...current, username: generatedUsername }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.username;
      return next;
    });
  };

  const handleShareOnWhatsApp = () => {
    const username = formValues.username.trim();
    if (!username) {
      notify("Generate or enter a username before sharing.", { type: "warning" });
      return;
    }

    const profileUrl = `${PROFILE_URL_PREFIX}${username}`;
    const whatsappText = `I have put for share few book on ${profileUrl}`;
    const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    window.open(whatsappShareUrl, "_blank", "noopener,noreferrer");
  };

  const [linkCopied, setLinkCopied] = React.useState(false);
  const handleCopyStoreLink = async () => {
    const username = formValues.username.trim();
    if (!username) {
      notify("Generate or enter a username before copying.", { type: "warning" });
      return;
    }

    const storeUrl = `https://putforshare.com/store/s/${username}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(storeUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = storeUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      notify("Unable to copy link to clipboard.", { type: "error" });
    }
  };

  const isSeller = String(formValues.pfs_role || "").toUpperCase() === "SELLER";
  const isSellerPlanLocked = isSeller && formValues.plan_locked;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setGlobalError("");
    setSuccessMessage("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const body = {
        username: formValues.username.trim(),
        full_name: formValues.full_name.trim(),
        mobile: formValues.mobile.trim(),
        favourite_book: formValues.favourite_book.trim(),
        profile_image_uuid: formValues.profile_image_uuid || null,
        upi_id: formValues.upi_id.trim(),
      };
      if (!isSeller || !formValues.plan_locked) {
        body.plan = formValues.plan;
      }

      const payload = await requestApi("/auth/me/", {
        method: "PATCH",
        body,
      });
      const updatedUser = payload?.user || {};
      saveSession(getStoredToken(), updatedUser);
      setUserForm(updatedUser);
      setSuccessMessage("Profile updated successfully.");
      notify("Profile updated successfully.", { type: "success" });
    } catch (error) {
      const apiErrors = normalizeFieldErrors(error?.body);
      setFieldErrors(apiErrors);
      const msg = firstErrorMessage(
        error?.body,
        error?.message || "Unable to update profile."
      );
      setGlobalError(msg);
      notify(msg, { type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" } }}>
      <Box sx={{ p: { xs: 2, sm: 3 }, flex: 1, minWidth: 0, maxWidth: 980 }}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography component="h1" sx={{ fontSize: 30, fontWeight: 700, color: "#0A4A47" }}>
            Edit My Profile
          </Typography>
          <Typography sx={{ mt: 0.5, mb: 2.5, color: "#4b5563" }}>
            Update your public profile, payout preference, and account details.
          </Typography>

          {globalError ? (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {globalError}
            </Alert>
          ) : null}
          {successMessage ? (
            <Alert severity="success" sx={{ mb: 1.5 }}>
              {successMessage}
            </Alert>
          ) : null}

          {isLoading ? (
            <Typography sx={{ color: "#4b5563" }}>Loading profile...</Typography>
          ) : (
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  Account Identity
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gap: 1.5,
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                  }}
                >
                  <Box sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" } }}>
                    <TextField variant="outlined" label="Email" value={formValues.email} disabled fullWidth />
                  </Box>

                  <Box>
                    <TextField
                      variant="outlined"
                      label="Username"
                      value={formValues.username}
                      onChange={handleChange("username")}
                      error={Boolean(fieldErrors.username?.[0])}
                      helperText={fieldErrors.username?.[0] || ""}
                      required
                      fullWidth
                      placeholder="username"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment
                            position="start"
                            sx={{
                              mr: 0,
                              px: 0.75,
                              py: 0.5,
                              bgcolor: "#f3f4f6",
                              borderRadius: 0.75,
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            {PROFILE_URL_PREFIX}
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                      <Button type="button" variant="outlined" size="small" onClick={handleGenerateUsername}>
                        Generate
                      </Button>
                      <Button
                        type="button"
                        variant="outlined"
                        size="small"
                        onClick={handleCopyStoreLink}
                        disabled={!formValues.username.trim()}
                      >
                        {linkCopied ? "Copied" : "Copy Link"}
                      </Button>
                      <Button
                        type="button"
                        variant="outlined"
                        size="small"
                        onClick={handleShareOnWhatsApp}
                        disabled={!formValues.username.trim()}
                      >
                        Share on WhatsApp
                      </Button>
                    </Box>
                  </Box>
                  <Box>
                    <TextField
                      variant="outlined"
                      label="Role"
                      value={formValues.pfs_role || "N/A"}
                      disabled
                      fullWidth
                    />
                  </Box>
                </Box>

                <Divider />

                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  Personal Details
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gap: 1.5,
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                  }}
                >
                  <TextField
                    variant="outlined"
                    label="Full Name"
                    value={formValues.full_name}
                    onChange={handleChange("full_name")}
                    error={Boolean(fieldErrors.full_name?.[0])}
                    helperText={fieldErrors.full_name?.[0] || ""}
                    fullWidth
                  />
                  <TextField
                    variant="outlined"
                    label="Mobile"
                    value={formValues.mobile}
                    onChange={handleChange("mobile")}
                    error={Boolean(fieldErrors.mobile?.[0])}
                    helperText={fieldErrors.mobile?.[0] || ""}
                    fullWidth
                  />
                  <TextField
                    variant="outlined"
                    label="Favourite Book"
                    value={formValues.favourite_book}
                    onChange={handleChange("favourite_book")}
                    error={Boolean(fieldErrors.favourite_book?.[0])}
                    helperText={fieldErrors.favourite_book?.[0] || ""}
                    fullWidth
                    sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" } }}
                  />
                  <TextField
                    variant="outlined"
                    label="Profile Image UUID"
                    value={formValues.profile_image_uuid}
                    onChange={handleChange("profile_image_uuid")}
                    error={Boolean(fieldErrors.profile_image_uuid?.[0])}
                    helperText={fieldErrors.profile_image_uuid?.[0] || ""}
                    fullWidth
                    sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" } }}
                  />
                </Box>

                <Divider />

                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  Payout and Plan
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gap: 1.5,
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                  }}
                >
                  <TextField
                    select
                    variant="outlined"
                    label="Plan"
                    value={formValues.plan}
                    onChange={handleChange("plan")}
                    disabled={isSellerPlanLocked}
                    error={Boolean(fieldErrors.plan?.[0])}
                    helperText={
                      fieldErrors.plan?.[0] ||
                      (isSeller
                        ? `Once plan choosen cannot be edited, it will be locked.${isSellerPlanLocked ? " Your plan is locked." : ""}`
                        : "")
                    }
                    fullWidth
                  >
                    {USER_PLAN_CHOICES.map((choice) => (
                      <MenuItem key={choice.id} value={choice.id}>
                        {choice.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    variant="outlined"
                    label="UPI ID"
                    value={formValues.upi_id}
                    onChange={handleChange("upi_id")}
                    error={Boolean(fieldErrors.upi_id?.[0])}
                    helperText={fieldErrors.upi_id?.[0] || ""}
                    fullWidth
                  />
                  <Box sx={{ display: "grid", gap: 1.1, gridColumn: { xs: "1 / -1", md: "1 / -1" } }}>
                    <Box
                      sx={{
                        px: 1.2,
                        py: 0.8,
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        color: formValues.mobile_verified ? "#065F46" : "#92400E",
                        backgroundColor: formValues.mobile_verified ? "#ECFDF5" : "#FEF3C7",
                        display: "inline-flex",
                        width: "fit-content",
                      }}
                    >
                      Mobile {formValues.mobile_verified ? "Verified" : "Unverified"}
                    </Box>
                    <Box
                      sx={{
                        px: 1.2,
                        py: 0.8,
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        color: formValues.upi_verified ? "#065F46" : "#92400E",
                        backgroundColor: formValues.upi_verified ? "#ECFDF5" : "#FEF3C7",
                        display: "inline-flex",
                        width: "fit-content",
                      }}
                    >
                      UPI {formValues.upi_verified ? "Verified" : "Unverified"}
                    </Box>
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                  <Button onClick={() => redirect("/")}>Cancel</Button>
                  <Button type="submit" variant="contained" disabled={isSubmitting}>
                    Save Changes
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
      </Box>
      <EditProfileHelpfulInfoAside />
    </Box>
  );
};

const SellerTopNav = () => {
  const { identity } = useGetIdentity();
  const navigate = useNavigate();
  const logout = useLogout();
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("sm"));

  const [menuAnchor, setMenuAnchor] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  const username =
    identity?.username ||
    identity?.full_name ||
    identity?.fullName ||
    identity?.name ||
    identity?.email ||
    "";

  const avatarLabel = username ? username.charAt(0).toUpperCase() : "U";
  const avatarSrc = toAbsoluteUrl(identity?.profile_image_url);

  const closeMenu = () => setMenuAnchor(null);

  React.useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
    // only run when breakpoint changes to avoid closing after manual user toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleLogout = async () => {
    closeMenu();
    await logout();
  };

  return (
    <Box
      component="header"
      sx={{
        backgroundColor: "#007073",
        color: "#fff",
        position: "sticky",
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <Box
        sx={{
          height: "60px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            width: { xs: "auto", sm: "30%" },
            flexGrow: { xs: 1, sm: 0 },
            minWidth: 0,
            px: 2,
            display: "flex",
            alignItems: "center",
            gap: 1.25,
          }}
        >
          <IconButton
            aria-label="toggle dashboard menu"
            onClick={toggleSidebar}
            sx={{ color: "#fff", p: 0.5 }}
          >
            <MenuIcon />
          </IconButton>
          <Box
            sx={{
              backgroundColor: "#FFF",
              borderRadius: 1,
              px: 0.75,
              py: 0.25,
              alignItems: "center",
              display: { xs: "none", sm: "flex" },
            }}
          >
            <Box
              component="img"
              src={logo}
              alt="Put For Share"
              sx={{
                height: 36,
                width: "auto",
                maxWidth: "100%",
                objectFit: "contain",
              }}
            />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <Typography
              component="h1"
              sx={{
                m: 0,
                fontSize: 24,
                lineHeight: 1,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              PutForShare
            </Typography>
            <Typography
              component="p"
              sx={{
                m: 0,
                mt: 0.25,
                fontSize: "10px",
                lineHeight: 1,
                color: "#fff",
              }}
            >
              Share Books Earn Money
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            width: "50%",
            px: 2,
            display: { xs: "none", sm: "flex" },
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search"
            size="small"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon fontSize="small" sx={{ color: "#374151" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: "100%",
              maxWidth: 460,
              backgroundColor: "#fff",
              borderRadius: 1,
              "& input": { color: "#1f2937" },
            }}
          />
        </Box>

        <Box
          sx={{
            width: { xs: "auto", sm: "20%" },
            px: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 1,
            flexShrink: 0,
          }}
        >
          <IconButton
            aria-label="help center"
            component="a"
            href="https://help.putforshare.com"
            target="_blank"
            rel="noreferrer"
            sx={{
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 2,
              mr: 0.25,
            }}
          >
            <HelpOutlineOutlinedIcon />
          </IconButton>
          {username ? (
            <>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: 14,
                  display: { xs: "none", sm: "block" },
                  maxWidth: { sm: 140, md: 220 },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={username}
              >
                {username}
              </Typography>
              <IconButton
                aria-label="user profile menu"
                onClick={(event) => setMenuAnchor(event.currentTarget)}
                sx={{ p: 0 }}
              >
                <Avatar
                  src={avatarSrc || undefined}
                  sx={{
                    width: 34,
                    height: 34,
                    fontSize: 15,
                    bgcolor: "#0A4A47",
                  }}
                >
                  {avatarSrc ? "" : avatarLabel}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
              >
                {identity?.pfs_role === "ADMIN" ? (
                  <MenuItem
                    onClick={() => {
                      closeMenu();
                      navigate("/admin");
                    }}
                  >
                    Admin Dashboard
                  </MenuItem>
                ) : null}
                {identity?.pfs_role === "ADMIN" ? <Divider /> : null}
                <MenuItem
                  onClick={() => {
                    closeMenu();
                    navigate("/my/profile/edit");
                  }}
                >
                  Edit My Profile
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    closeMenu();
                    navigate("/my/change-password");
                  }}
                >
                  Change Password
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              variant="contained"
              component={RouterLink}
              to="/signup"
              sx={{
                whiteSpace: "nowrap",
                backgroundColor: "#0A4A47",
                "&:hover": { backgroundColor: "#083B39" },
              }}
            >
              Get Started
            </Button>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: { xs: "flex", sm: "none" },
          px: 2,
          pb: 1,
        }}
      >
        <TextField
          variant="outlined"
          placeholder="Search"
          size="small"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon fontSize="small" sx={{ color: "#374151" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: "100%",
            backgroundColor: "#fff",
            borderRadius: 1,
            "& input": { color: "#1f2937" },
          }}
        />
      </Box>
    </Box>
  );
};

const EmptyAppBar = () => null;

const SidebarNavItem = ({ to, label, icon, exact = false }) => {
  const [sidebarOpen] = useSidebarState();
  const location = useLocation();
  const pathname = location.pathname || "/";
  const normalizedTo = to.endsWith("/") && to !== "/" ? to.slice(0, -1) : to;
  const isSelected = exact
    ? pathname === normalizedTo || pathname === `${normalizedTo}/`
    : pathname === normalizedTo || pathname.startsWith(`${normalizedTo}/`);

  return (
    <Tooltip title={!sidebarOpen ? label : ""} placement="right">
      <MenuItem
        component={RouterLink}
        to={to}
        selected={isSelected}
        sx={{
          mx: 1,
          my: 0.25,
          px: sidebarOpen ? 1 : 1.5,
          py: 0.75,
          borderRadius: 1,
          color: isSelected ? "#0A4A47" : "#4b5563",
          justifyContent: sidebarOpen ? "flex-start" : "center",
          "& .MuiListItemIcon-root": {
            minWidth: sidebarOpen ? 40 : "auto",
            mr: sidebarOpen ? 1.5 : 0,
            color: isSelected ? "#0A4A47" : "#6b7280",
            justifyContent: "center",
          },
          "& .MuiListItemText-primary": {
            fontWeight: isSelected ? 700 : 500,
          },
          "&.Mui-selected": {
            backgroundColor: "#b2ecb2",
          },
          "&.Mui-selected:hover": {
            backgroundColor: "#b2ecb2",
          },
        }}
      >
        <ListItemIcon>{icon}</ListItemIcon>
        {sidebarOpen ? <ListItemText primary={label} /> : null}
      </MenuItem>
    </Tooltip>
  );
};

const SellerSidebarMenu = () => {
  const { permissions } = usePermissions();

  return (
      <RaMenu>
      {permissions === "ADMIN" ? (
        <>
          <SidebarNavItem
            to="/earning-calculator"
            label="Earning Calculator"
            icon={<CalculateOutlinedIcon />}
            exact
          />
          <SidebarNavItem
            to="/admin"
            label="Admin Dashboard"
            icon={<AdminPanelSettingsOutlinedIcon />}
            exact
          />
          <SidebarNavItem
            to="/admin/users"
            label="Users"
            icon={<GroupOutlinedIcon />}
          />
          <SidebarNavItem
            to="/admin/orders"
            label="Orders"
            icon={<ReceiptOutlinedIcon />}
          />
          <SidebarNavItem
            to="/admin/addresses"
            label="Address Book"
            icon={<ContactsOutlinedIcon />}
          />
          <SidebarNavItem
            to="/admin/inventories"
            label="Inventories"
            icon={<MenuBookOutlinedIcon />}
          />
          <SidebarNavItem
            to="/admin/photos"
            label="Photos"
            icon={<PhotoCameraOutlinedIcon />}
          />
          <SidebarNavItem
            to="/admin/s3-browser"
            label="S3 Browser"
            icon={<CloudOutlinedIcon />}
          />
          <SidebarNavItem
            to="/admin/packages"
            label="Packages"
            icon={<Inventory2OutlinedIcon />}
          />
          <SidebarNavItem
            to="/admin/pickup-requests"
            label="Pickup Requests"
            icon={<LocalShippingOutlinedIcon />}
          />
          <SidebarNavItem
            to="/admin/pincodes"
            label="Pincodes"
            icon={<SearchIcon />}
          />
        </>
      ) : (
        <>
          <SidebarNavItem
            to="/earning-calculator"
            label="Earning Calculator"
            icon={<CalculateOutlinedIcon />}
            exact
          />
          <SidebarNavItem
            to="/my"
            label="My Dashboard"
            icon={<DashboardOutlinedIcon />}
            exact
          />
          <SidebarNavItem
            to="/my/address"
            label="My Address Book"
            icon={<ContactsOutlinedIcon />}
          />
          <SidebarNavItem
            to="/my/packages"
            label="My Packages"
            icon={<Inventory2OutlinedIcon />}
          />
          <SidebarNavItem
            to="/my/pickup-requests"
            label="My Pickup Requests"
            icon={<LocalShippingOutlinedIcon />}
          />
          <SidebarNavItem
            to="/my/inventories"
            label="My Inventories"
            icon={<MenuBookOutlinedIcon />}
          />
        </>
      )}
    </RaMenu>
  );
};

const SellerLayout = (props) => (
  <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f7fa" }}>
    <SellerTopNav />
    <Layout
      {...props}
      appBar={EmptyAppBar}
      menu={SellerSidebarMenu}
      sx={{
        "& .RaLayout-appFrame": {
          marginTop: 0,
        },
      }}
    />
  </Box>
);

const SellerDashboard = () => {
  const { identity } = useGetIdentity();
  React.useEffect(() => {
    document.title = "My Dashboard | PutForShare";
  }, []);
  const inventoryQuery = {
    pagination: { page: 1, perPage: 1 },
    sort: { field: "updated_on", order: "DESC" },
  };
  const {
    total: totalInventories = 0,
    isLoading: isInventoryLoading,
    error: inventoryError,
  } = useGetList("my/inventories", {
    ...inventoryQuery,
    filter: {},
  });
  const { total: activeInventories = 0 } = useGetList("my/inventories", {
    ...inventoryQuery,
    filter: { is_active: true },
  });
  const { total: inactiveInventories = 0 } = useGetList("my/inventories", {
    ...inventoryQuery,
    filter: { is_active: false },
  });
  const {
    total: totalPackages = 0,
    isLoading: isPackagesLoading,
    error: packagesError,
  } = useGetList("my/packages", {
    ...inventoryQuery,
    filter: {},
  });
  const {
    total: totalPickupRequests = 0,
    isLoading: isPickupRequestsLoading,
    error: pickupRequestsError,
  } = useGetList("my/pickup-requests", {
    ...inventoryQuery,
    filter: {},
  });

  const cards = [
    {
      label: "Inventories",
      value: isInventoryLoading ? "..." : String(totalInventories),
      subtitle: inventoryError
        ? "Unable to load inventory stats"
        : `Active (${activeInventories}) / Inactive (${inactiveInventories})`,
    },
    { label: "Number of Orders", value: "0" },
    { label: "Revenue", value: "₹0" },
    { label: "Average Order Value", value: "₹0" },
    {
      label: "Packages",
      value: isPackagesLoading ? "..." : String(totalPackages),
      subtitle: packagesError ? "Unable to load package stats" : null,
      actionLabel: "Add Packages",
      actionTo: "/my/packages",
      actionIcon: <Inventory2OutlinedIcon fontSize="small" />,
    },
    {
      label: "Pickup Requests",
      value: isPickupRequestsLoading ? "..." : String(totalPickupRequests),
      subtitle: pickupRequestsError ? "Unable to load pickup stats" : null,
      actionLabel: "Pickup Requests",
      actionTo: "/my/pickup-requests",
      actionIcon: <LocalShippingOutlinedIcon fontSize="small" />,
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" } }}>
      <Box sx={{ p: { xs: 2, sm: 3 }, flex: 1, minWidth: 0 }}>
        <Typography
          component="h2"
          sx={{ fontSize: 30, fontWeight: 700, color: "#0A4A47" }}
        >
          My Dashboard
        </Typography>
        <Typography sx={{ mt: 0.5, mb: 2.5, color: "#4b5563" }}>
          Hello{" "}
          {identity?.full_name ||
            identity?.username ||
            identity?.email ||
            "Seller"}
          .
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
            gap: 2,
          }}
        >
          {cards.map((card) => (
            <Card key={card.label}>
              <CardContent>
                <Typography sx={{ fontSize: 13, color: "#6b7280" }}>
                  {card.label}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.5,
                    fontSize: 30,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  {card.value}
                </Typography>
                {card.subtitleLines ? (
                  <Box sx={{ mt: 1 }}>
                    {card.subtitleLines.map((line) => (
                      <Typography
                        key={line}
                        sx={{ fontSize: 14, color: "#374151" }}
                      >
                        {line}
                      </Typography>
                    ))}
                  </Box>
                ) : card.subtitle ? (
                  <Typography sx={{ mt: 1, fontSize: 14, color: "#374151" }}>
                    {card.subtitle}
                  </Typography>
                ) : null}
                {card.actionTo ? (
                  <Button
                    size="small"
                    component={RouterLink}
                    to={card.actionTo}
                    startIcon={card.actionIcon}
                    variant="outlined"
                    sx={{
                      mt: 1.5,
                      borderRadius: 999,
                      textTransform: "none",
                      fontWeight: 600,
                      borderColor: "#0A4A47",
                      color: "#0A4A47",
                      "&:hover": {
                        borderColor: "#083B39",
                        backgroundColor: "rgba(10, 74, 71, 0.08)",
                      },
                    }}
                  >
                    {card.actionLabel}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
      <DashboardHelpfulInfoAside />
    </Box>
  );
};

const SuperAdminDashboardPage = () => {
  const { identity } = useGetIdentity();
  const notify = useNotify();
  React.useEffect(() => {
    document.title = "Admin Dashboard | PutForShare";
  }, []);

  const [kpis, setKpis] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");

  const loadKpis = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const payload = await requestApi("/admin/kpis/");
      setKpis(payload || {});
    } catch (error) {
      const message = firstErrorMessage(
        error?.body,
        error?.message || "Unable to load admin KPIs."
      );
      setLoadError(message);
      notify(message, { type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  React.useEffect(() => {
    if (identity?.pfs_role === "ADMIN") {
      loadKpis();
    }
  }, [identity?.pfs_role, loadKpis]);

  if (identity?.pfs_role !== "ADMIN") {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">
          You do not have permission to access the Super Admin dashboard.
        </Alert>
      </Box>
    );
  }

  const users = kpis?.users || {};
  const orders = kpis?.orders || {};
  const revenue = kpis?.revenue || {};
  const addresses = kpis?.addresses || {};
  const packages = kpis?.packages || {};
  const pickups = kpis?.pickup_requests || {};
  const merchantFeed = kpis?.merchant_feed || {};

  const currency = revenue.currency || "INR";
  const revenueValue = Number(revenue.total || 0);
  const formattedRevenue = Number.isFinite(revenueValue)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(revenueValue)
    : `${currency} 0`;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography
          component="h2"
          sx={{ fontSize: 30, fontWeight: 700, color: "#0A4A47" }}
        >
          Admin Dashboard
        </Typography>
        <Button variant="outlined" onClick={loadKpis} disabled={isLoading}>
          Refresh
        </Button>
      </Box>

      <Typography sx={{ mt: 0.5, mb: 2.5, color: "#4b5563" }}>
        Important KPI overview for platform operations.
      </Typography>

      {loadError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      ) : null}

      {isLoading && !kpis ? (
        <Typography sx={{ color: "#4b5563" }}>Loading metrics...</Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          <Card>
            <CardContent>
              <Typography sx={{ fontSize: 13, color: "#6b7280" }}>
                Total Users
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {users.total ?? 0}
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 14, color: "#374151" }}>
                Active ({users.active ?? 0}) / Banned ({users.banned ?? 0})
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography sx={{ fontSize: 13, color: "#6b7280" }}>
                Total Orders
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {orders.total ?? 0}
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 14, color: "#374151" }}>
                Booked ({orders.booked ?? 0}) / Picked ({orders.picked ?? 0}) /
                Delivered ({orders.delivered ?? 0})
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography sx={{ fontSize: 13, color: "#6b7280" }}>
                Total Revenue
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {formattedRevenue}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography sx={{ fontSize: 13, color: "#6b7280" }}>
                Total Address
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {addresses.total ?? 0}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography sx={{ fontSize: 13, color: "#6b7280" }}>
                Total Packages
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {packages.total ?? 0}
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 14, color: "#374151" }}>
                Used in pickup req ({packages.used_in_pickup_requests ?? 0}) /
                Orphan ({packages.orphan ?? 0})
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography sx={{ fontSize: 13, color: "#6b7280" }}>
                Total Pickup Req
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {pickups.total ?? 0}
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 14, color: "#374151" }}>
                Draft ({pickups.draft ?? 0}) / Booked ({pickups.booked ?? 0}) /
                Picked ({pickups.picked ?? 0}) / Cancelled (
                {pickups.cancelled ?? 0})
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography sx={{ fontSize: 13, color: "#6b7280" }}>
                Merchant Feed
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {merchantFeed.pending_queue ?? 0}
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 14, color: "#374151" }}>
                Pending queue entries
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
                Success 24h ({merchantFeed.success_24h ?? 0}) / Failed 24h (
                {merchantFeed.failed_24h ?? 0})
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 13, color: "#4b5563" }}>
                Last status: {merchantFeed.last_status || "-"}
              </Typography>
              {merchantFeed.last_error ? (
                <Typography sx={{ mt: 0.5, fontSize: 12, color: "#991b1b" }}>
                  Last error: {merchantFeed.last_error}
                </Typography>
              ) : null}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

const App = () => (
  <Admin
    dataProvider={dataProvider}
    authProvider={authProvider}
    loginPage={LoginPage}
    layout={SellerLayout}
    requireAuth
  >
    {(permissions) => [
      <CustomRoutes noLayout key="public-auth-routes">
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/earning-calculator" element={<EarningsPage />} />
      </CustomRoutes>,
      <CustomRoutes key="private-routes">
        <Route path="/my/profile/edit" element={<EditMyProfilePage />} />
        <Route path="/my/change-password" element={<ChangePasswordPage />} />
      </CustomRoutes>,
      permissions !== "ADMIN" ? (
        <CustomRoutes key="seller-dashboard-legacy-route">
          <Route path="/dashboard" element={<Navigate to="/my" replace />} />
        </CustomRoutes>
      ) : null,
      permissions === "ADMIN" ? (
        <Resource
          key="super-admin-resource"
          name="admin"
          list={SuperAdminDashboardPage}
          icon={AdminPanelSettingsOutlinedIcon}
          options={{ label: "Admin Dashboard" }}
        />
      ) : null,
      permissions === "ADMIN" ? (
        <Resource
          key="admin-users-resource"
          name="admin/users"
          list={AdminUserList}
          create={AdminUserCreate}
          edit={AdminUserEdit}
          show={AdminUserShow}
          icon={GroupOutlinedIcon}
          options={{ label: "Users" }}
        />
      ) : null,
      permissions === "ADMIN" ? (
        <Resource
          key="admin-orders-resource"
          name="admin/orders"
          list={AdminOrderList}
          show={AdminOrderShow}
          icon={ReceiptOutlinedIcon}
          options={{ label: "Orders" }}
        />
      ) : null,
      permissions === "ADMIN" ? (
        <Resource
          key="admin-addresses-resource"
          name="admin/addresses"
          list={AdminAddressList}
          create={AdminAddressCreate}
          edit={AdminAddressEdit}
          show={AdminAddressShow}
          icon={ContactsOutlinedIcon}
          options={{ label: "Address Book" }}
        />
      ) : null,
      permissions === "ADMIN" ? (
        <Resource
          key="admin-inventories-resource"
          name="admin/inventories"
          list={AdminInventoryList}
          create={AdminInventoryCreate}
          edit={AdminInventoryEdit}
          show={AdminInventoryShow}
          icon={MenuBookOutlinedIcon}
          options={{ label: "Inventories" }}
        />
      ) : null,
      permissions === "ADMIN" ? (
        <Resource
          key="admin-photos-resource"
          name="admin/photos"
          list={PhotoList}
          create={PhotoCreate}
          edit={PhotoEdit}
          show={PhotoShow}
          icon={PhotoCameraOutlinedIcon}
          options={{ label: "Photos" }}
        />
      ) : null,
      permissions === "ADMIN" ? (
        <Resource
          key="admin-s3-browser-resource"
          name="admin/s3-browser"
          list={S3BrowserList}
          show={S3BrowserShow}
          icon={CloudOutlinedIcon}
          options={{ label: "S3 Browser" }}
        />
      ) : null,
      permissions === "ADMIN" ? (
        <Resource
          key="admin-packages-resource"
          name="admin/packages"
          list={AdminPackageList}
          create={AdminPackageCreate}
          edit={AdminPackageEdit}
          show={AdminPackageShow}
          icon={Inventory2OutlinedIcon}
          options={{ label: "Packages" }}
        />
      ) : null,
      permissions === "ADMIN" ? (
        <Resource
          key="admin-pickup-requests-resource"
          name="admin/pickup-requests"
          list={AdminPickupList}
          create={AdminPickupCreate}
          edit={AdminPickupEdit}
          show={AdminPickupShow}
          icon={LocalShippingOutlinedIcon}
          options={{ label: "Pickup Requests" }}
        />
      ) : null,
      permissions === "ADMIN" ? (
        <Resource
          key="admin-pincodes-resource"
          name="admin/pincodes"
          list={ServicabilityCheckList}
          create={PincodeCreate}
          edit={PincodeEdit}
          show={PincodeShow}
          icon={SearchIcon}
          options={{ label: "Pincodes" }}
        />
      ) : null,
      permissions !== "ADMIN" ? (
        <Resource
          key="seller-dashboard-resource"
          name="my"
          list={SellerDashboard}
          icon={DashboardOutlinedIcon}
          options={{ label: "Dashboard" }}
        />
      ) : null,
      permissions !== "ADMIN" ? (
        <Resource
          key="seller-address-resource"
          name="my/address"
          list={AddressList}
          create={AddressCreate}
          edit={AddressEdit}
          show={AddressShow}
          icon={ContactsOutlinedIcon}
          options={{ label: "Address Book" }}
        />
      ) : null,
      permissions !== "ADMIN" ? (
        <Resource
          key="seller-packages-resource"
          name="my/packages"
          list={PackageList}
          create={PackageCreate}
          edit={PackageEdit}
          show={PackageShow}
          icon={Inventory2OutlinedIcon}
          options={{ label: "Packages" }}
        />
      ) : null,
      permissions !== "ADMIN" ? (
        <Resource
          key="seller-pickup-requests-resource"
          name="my/pickup-requests"
          list={PickupRequestList}
          create={PickupRequestCreate}
          edit={PickupRequestEdit}
          show={PickupRequestShow}
          icon={LocalShippingOutlinedIcon}
          options={{ label: "Pickup Requests" }}
        />
      ) : null,
      permissions !== "ADMIN" ? (
        <Resource
          key="seller-inventories-resource"
          name="my/inventories"
          list={InventoryList}
          create={InventoryCreate}
          edit={InventoryEdit}
          show={InventoryShow}
          icon={MenuBookOutlinedIcon}
          options={{ label: "Inventories" }}
        />
      ) : null,
    ]}
  </Admin>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={brandTheme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
