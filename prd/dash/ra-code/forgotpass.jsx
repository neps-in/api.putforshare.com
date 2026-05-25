import * as React from "react";
import { useState } from "react";
import { useNotify, useRedirect } from "react-admin";

// React admin

// MUI
import { Alert, CircularProgress } from "@mui/material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";

import { config } from "../AppConstants";
import pfsLogo from "../assets/pfs-logo-vsml.png";
import PfsTheme from "../layout/PfsTheme";

function Copyright(props) {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      align="center"
      {...props}
    >
      {"Copyright © "}
      <Link color="inherit" href="https://putforshare.com/">
        PutForShare.com
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}

export const ForgotPassword = ({ theme = PfsTheme }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const notify = useNotify();
  const redirect = useRedirect(); // Add redirect here
  const [errors, setErrors] = useState(null);

  const handleTextChange = (event) => setEmail(event.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors(null); // Reset errors on new submission

    try {
      const response = await fetch(`${config.apiUrl}/users/password_reset/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        notify("Password reset email sent successfully", { type: "info" });
      } else {
        const errorData = await response.json();
        if (errorData?.errors) {
          setErrors(errorData?.errors); // Display validation errors
        } else if (errorData?.error) {
          notify(
            errorData?.error || "Failed to reset password. Please try again.",
            { type: "warning" }
          );
        }
      }
    } catch (error) {
      notify("Network error occurred. Please try again.", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // @Todo enable once you receive valid email.
  // const handleTextChange = (event) => {
  //   console.log('Text changed !!!!');
  //   this.setState({email: event.target.value})

  //   // don't remember from where i copied this code, but this works.
  //   let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  //   if ( re.test(email) ) {
  //     console.log('YEEEEE!!!!', {email});
  //       setEmail(email);
  //       // this is a valid email address
  //       // call setState({email: email}) to update the email
  //       // or update the data in redux store.

  //   }
  //   else {
  //     console.log('Invalide Email!!!!!!!!', {email});
  //       // invalid email, maybe show an error to the user.
  //   }
  // };

  return (
    <ThemeProvider theme={theme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Paper
          borderRadius={2}
          elevation={3}
          sx={{
            padding: 5,
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography component="h2" variant="h5">
            <img src={pfsLogo} alt="PutForShare.com Logo" />
            &nbsp;&nbsp;PutForShare.com
          </Typography>
          <Typography component="h3" variant="h6">
            Forgot your password ?
          </Typography>
          {errors && (
            <Box sx={{ mb: 2 }}>
              {Object.entries(errors).map(([field, messages]) => (
                <Alert key={field} severity="error">
                  {field}: {messages.join(", ")}
                </Alert>
              ))}
            </Box>
          )}
          <Box component="form" noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              variant="outlined"
              onChange={handleTextChange}
            />

            <Button
              disabled={loading}
              type="button"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              onClick={handleSubmit}
              aria-label="Recover password"
            >
              {loading ? <CircularProgress size={24} /> : "Recover my Password"}
            </Button>
            <Grid container>
              <Grid item xs>
                <Link href="/#/login" variant="body2">
                  Remembered your password? Login now
                </Link>
              </Grid>
            </Grid>
            <Grid container justifyContent="flex-end">
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
                  Trouble with recovering your password ? hi@putforshare.com
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
        <Copyright sx={{ mt: 8, mb: 4 }} />
      </Container>
    </ThemeProvider>
  );
};
