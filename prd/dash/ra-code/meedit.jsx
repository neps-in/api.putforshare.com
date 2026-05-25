// /users/me.jsx
import Grid from "@mui/material/Grid";
import { useEffect, useState } from "react";
import {
  SelectInput,
  SimpleForm,
  TextInput,
  useAuthProvider,
  useNotify,
} from "react-admin";
import { config } from "../AppConstants";
import { ModuleHeading } from "../layout/ModuleHeading";

// Form validators
import { choices, regex, required } from "react-admin";

const validateFullName = [required()];
const validateMobNum = [required()];
const validatePinCode = regex(/^\d{6}$/, "Check if your PINCODE is correct");
const validateAddressType = choices(
  ["RESIDENCE_ADDRESS", "COMMERCIAL_ADDRESS"],
  "Please choose one of the address type"
);

const pfs_donation_choices = [
  { value: "100", label: "100% Donate for Scholarship" },
  { value: "75", label: "75% Donate for Scholarship" },
  { value: "50", label: "50% Donate for Scholarship" },
  { value: "25", label: "25% Donate for Scholarship" },
  { value: "0", label: "0% Donate for Scholarship, 100% Sell and Earn." },
];

export const UserMeEdit = () => {
  const notify = useNotify();
  const authProvider = useAuthProvider();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const authinfo = JSON.parse(localStorage.getItem("auth"));
        const token = authinfo.access;

        const response = await fetch(`${config.apiUrl}/users/me/`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch user profile");
        const data = await response.json();
        setUserData(data);
      } catch (error) {
        notify(`Error: ${error.message}`, { type: "error" });
      }
    };

    fetchUserProfile();
  }, [authProvider, notify]);

  const onSubmit = async (values) => {
    try {
      const authinfo = JSON.parse(localStorage.getItem("auth"));
      const token = authinfo.access;

      const response = await fetch(`${config.apiUrl}/users/me/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Failed to update user profile");
      notify("Profile updated successfully", { type: "success" });
    } catch (error) {
      notify(`Error: ${error.message}`, { type: "error" });
    }
  };

  if (!userData) return <p>Loading...</p>;

  return (
    <SimpleForm
      onSubmit={onSubmit}
      defaultValues={userData} // this populates all matching `source` fields
    >
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4} md={6} lg={6} xl={6}>
          <ModuleHeading heading="Edit your profile information" />

          <TextInput
            label="Full Name"
            source="fullname"
            validate={validateFullName}
            fullWidth
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
          <SelectInput
            source="donate_books_option"
            label="Donation Option"
            choices={pfs_donation_choices}
            optionText="label"
            optionValue="value"
            variant="outlined"
            fullWidth
            helperText="Choose an option"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
          <TextInput
            label="UPI ID"
            source="upi_id"
            variant="outlined"
            validate={validateMobNum}
            helperText="Please give your UPI ID."
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
          <TextInput
            label="UPI Last verified on"
            source="upi_last_verified_on"
            variant="outlined"
            disabled
            fullWidth
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4} md={10} lg={10} xl={10}>
          <TextInput
            label="Best Favourite Book"
            source="best_favourite_book"
            fullWidth
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4} md={6} lg={6} xl={6}>
          <TextInput label="Mobile #" source="mobile" fullWidth />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
          <TextInput
            label="Inventories"
            source="inventory_count"
            variant="outlined"
            disabled
            helperText="This is auto generated field."
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
          <TextInput
            label="Storecredits"
            source="store_credit"
            variant="outlined"
            disabled
            helperText="This is auto generated field."
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
          <TextInput
            label="Net Earnings"
            source="net_earnings"
            disabled
            variant="outlined"
            helperText="This is auto generated field."
            fullWidth
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
          <TextInput
            label="Start Date"
            source="start_date"
            variant="outlined"
            disabled
            helperText="This is auto generated field."
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
          <TextInput
            label="Last Updated on"
            source="updated_on"
            variant="outlined"
            disabled
            helperText="This is auto generated field."
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4} xl={4}>
          <TextInput
            label="Active"
            source="is_active"
            disabled
            variant="outlined"
            helperText="This is auto generated field."
            fullWidth
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4} md={10} lg={10} xl={10}>
          <a href="#/change-my-password">Change My Password</a>
        </Grid>
      </Grid>
    </SimpleForm>
  );
};
