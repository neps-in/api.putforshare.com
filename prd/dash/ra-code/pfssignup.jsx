import { Box, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { makeStyles } from "@mui/styles";
import * as React from "react";
import { useState } from "react";

import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CssBaseline from "@mui/material/CssBaseline";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";

// To show hide password in the password box
import { Visibility, VisibilityOff } from "@mui/icons-material";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";

// import {
//   GoogleReCaptchaProvider,
//   useGoogleReCaptcha,
//   GoogleReCaptcha
// } from "react-google-recaptcha-v3";
// import Copyright from '../components/copyright';

import Container from "@mui/material/Container";

import pfsLogo from "../assets/pfs-logo-vsml.png";

// import useHistory  from 'react-router-dom';
import { useNavigate } from "react-router-dom";

import { useNotify, useRedirect } from "react-admin";

// Form validators
import { email, required } from "react-admin";

import axiosInstance from "../axios";

import { PfsThemeMui } from "../layout/PfsThemeMui";

const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: 8, //theme.spacing(1),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: 15,
  },
  handlelegend: {
    margin: 0,
    padding: "5px",
    fontSize: ".8em",
    textAlign: "center",
    backgroundColor: "#f4edbf",
  },
  avatar: {
    margin: 8,
    backgroundColor: "orange", //theme.palette.secondary.main,
  },
  form: {
    width: "100%", // Fix IE 11 issue.
    marginTop: 3, //theme.spacing(3),
  },
  submit: {
    margin: "3 0 2",
  },
  chkboxagree: {
    width: "100%",
  },
}));

function extractFieldErrors(json) {
  const errors = {};

  for (const [field, messages] of Object.entries(json)) {
    errors[field] = Array.isArray(messages) ? messages.join(", ") : messages;
  }

  return errors;
}
const validateEmail = email("Looks like its not an email.");

const validateEmailIsUnique = async (value) => {
  const location = window.location.hostname + window.location.port;
  var isEmailUnique = false;
  // const isEmailUnique = await checkEmailIsUnique(value);
  // await call begin
  const settings = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  };
  try {
    const fetchResponse = await fetch(`${location}/api/users/signup`, settings);
    isEmailUnique = await fetchResponse.json();
  } catch (e) {
    return e;
  }

  // await call ends

  if (isEmailUnique) {
    // Its unique
    return;
  } else {
    // not unique, found duplicate
    return {
      message: "Email already taken, Please choose something else!",
      args: { email: value },
    };
  }
};

const emailValidators = [
  required(),
  email("Looks like its not an email id"),
  validateEmailIsUnique,
];

function extractErrorMessage(error) {
  const data = error?.response?.data;

  if (!data) return error?.message || "Unknown error";

  if (typeof data === "string") return data;

  if (data.detail) return data.detail;
  if (data.message) return data.message;

  // Handle field-level errors
  if (typeof data === "object") {
    return Object.entries(data)
      .map(
        ([field, messages]) =>
          `${field}: ${
            Array.isArray(messages) ? messages.join(", ") : messages
          }`
      )
      .join(" | ");
  }

  return "An unknown error occurred";
}

//export default function PfsSignUp() {
export const PfsSignUp = ({ theme = PfsThemeMui }) => {
  // const history = useHistory(); // react-router-dom v
  const history = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  var usernamedisplay = "@aruldddd";

  const notify = useNotify();
  const redirect = useRedirect();

  const initialFormData = Object.freeze({
    email: "",
    username: "",
    password: "",
    fullname: "",
  });

  const [formData, updateFormData] = useState(initialFormData);

  const handleChange = (e) => {
    // Check if terms of service is checked
    if (e.target.type == "checkbox") {
      if (e.target.name == "chkboxagree" && e.target.checked) {
        console.log("handleChange", e.target.name);

        console.log("✅ Checkbox is checked");
        notify("Hope you have read our terms of Service.", { type: "info" });
      } else {
        notify(
          "Please make sure you read and agree to Terms of Service before using PutForShare.",
          { type: "warning" }
        );
        console.log("⛔️ Checkbox is NOT checked");
      }
    }

    updateFormData({
      ...formData,

      // @TODO: Fix legent to be dynamic https://putforshare.com/{userdisplayname}
      //[usernamedisplay]: formData.username.value,
      // Trimming any whitespace
      [e.target.name]: e.target.value.trim(),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
    console.log("handleSubmit", e.target.chkboxagree);
    if (e.target.chkboxagree.checked) {
      console.log("✅ Checkbox is checked");
      // cap_val : Captcha Value
      axiosInstance
        .post("/users/signup", {
          email: formData.email,
          username: formData.username,
          password: formData.password,
          fullname: formData.fullname,
          cap_val: formData.cap_val,
        })
        .then((res) => {
          redirect("/#/login");
          notify(
            "Welcome to PutForShare, Please check your email for account activation link. You can login once activated.",
            { type: "success" }
          );
          console.log(res);
          console.log(res.data);
        })
        .catch((error) => {
          const message = extractErrorMessage(error);
          notify(message, { type: "error" });
          console.log("Error details:", error.response?.data);

          // const emsg = JSON.parse(error.response.data);
          // const message =
          //   // error?.body?.detail ||
          //   // error?.body?.message ||
          //   // error?.message ||
          //   // error?.detail ||
          //   error?.response.data || response.statusText; // fallback to field-level error formatter

          // notify(message, { type: "error" });

          // const emsg = error.response.data.email[0];
          // notify(emsg, { type: 'warning' });
          // console.log("error message ");
          // console.log(error.response.data);
        });
    } else {
      notify("Please make sure you agree to Terms of PutForShare.", {
        type: "warning",
      });
      console.log("⛔️ Checkbox is NOT checked");
    }

    //   .catch(res => {
    //     notify( res.data , { type: 'warning' });
    //     // notify( error.res.data , { type: 'warning' });
    //     console.log('There was an error!', res );
    // });
  };

  const classes = useStyles();

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <ThemeProvider theme={theme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Paper className={classes.paper} elevation={3}>
          <Typography component="h1" variant="h5">
            <img src={pfsLogo} alt="PutForShare.com Logo" />
            &nbsp;&nbsp;PutForShare.com
          </Typography>
          <Typography component="h3" variant="h6">
            Sign Up
          </Typography>
          <form className={classes.form} onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  margin="normal"
                  variant="outlined"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  onChange={handleChange}
                  validate={emailValidators}
                />
                <TextField
                  required
                  fullWidth
                  variant="outlined"
                  margin="normal"
                  id="fullName"
                  label="Your Full Name"
                  name="fullname"
                  autoComplete="fullname"
                  onChange={handleChange}
                />
              </Grid>
              {/* <Grid item xs={12}>
                
              </Grid> */}
              {/* <Grid item xs={12}>
                
              </Grid> */}
              <Grid item xs={12}>
                <p className={classes.handlelegend}>
                  {" "}
                  PutForShare.com/{usernamedisplay} - To share with your friends
                </p>
                <TextField
                  required
                  fullWidth
                  variant="outlined"
                  margin="normal"
                  id="userName"
                  label="User Name"
                  name="username"
                  autoComplete="full-name"
                  onChange={handleChange}
                />
                <TextField
                  variant="outlined"
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="new-password"
                  onChange={handleChange}
                  // style={{ width: '365px' }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={togglePasswordVisibility}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <FormControlLabel
                    name="chkboxagree"
                    margin="normal"
                    onChange={handleChange}
                    className={classes.chkboxagree}
                    control={
                      <Checkbox value="allowExtraEmails" color="primary" />
                    }
                    label="I agree to Terms of Services."
                  />
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://putforshare.com/terms-of-service/"
                    style={{ marginTop: "10px" }}
                  >
                    Terms
                  </a>
                </div>
              </Grid>
            </Grid>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign Up
            </Button>
            {/* <GoogleReCaptchaProvider
                  language="en-UK"
                  reCaptchaKey="6Le5VyUiAAAAAEj6zIa-jmcxfAuSKb-DoJc_UfXn"
                >
            </GoogleReCaptchaProvider> */}
          </form>
          <Grid container justifyContent="flex-center">
            <Grid item>
              <Link href="/#/login" variant="body2">
                Already have an account? Sign in
              </Link>
            </Grid>
          </Grid>
          <Grid container justifyContent="center">
            <Grid item>
              <Box
                sx={{
                  mt: "15px",
                  border: "1px solid #b1e7e9",
                  backgroundColor: "#b1e7e9",
                  color: "#000",
                  borderRadius: "5px",
                  padding: "10px",
                  textAlign: "center",
                }}
              >
                Trouble with signup ?{" "}
                <a href="https://putforshare.com/contact-us/" target="_blank">
                  contact us
                </a>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </ThemeProvider>
  );
};
