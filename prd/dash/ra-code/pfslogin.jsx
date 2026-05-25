import * as React from "react";
import { useState } from "react";

// React admin
import { email, required, useLogin, useNotify } from "react-admin";

// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

// To show hide password in the password box
import { Visibility, VisibilityOff } from "@mui/icons-material";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";

import pfsLogo from "../assets/pfs-logo-vsml.png";

const validateLoginEmail = [required(), email()];
const validateRequired = [required()];
// define a theme, for example...
const PfsTheme = createTheme({
  palette: {
    primary: {
      main: "#007073",
    },
    secondary: {
      main: "#fff",
    },
  },
});

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

export const PfsLoginPage = ({ theme = PfsTheme }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const notify = useNotify();

  // Login
  // const handleSubmit = e => {
  //   e.preventDefault();
  //   // will call authProvider.login({ email, password })
  //   login({ email, password }).catch(() =>
  //     notify('Invalid email or password')
  //   );
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await login({ email, password });
    } catch (error) {
      console.log("CATCH ----------------", error);
      // error is usually an instance of HttpError with a `body` or `message` field
      const message =
        error?.body?.detail ||
        error?.body?.message ||
        error?.message ||
        error?.detail ||
        "Login failed";
      notify(message, { type: "error" });
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <ThemeProvider theme={theme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Paper
          elevation={4}
          borderradius={2}
          margin={10}
          sx={{
            padding: 5,
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography component="h1" variant="h5">
            <img src={pfsLogo} alt="PutForShare.com Logo" />
            &nbsp;&nbsp;PutForShare.com
          </Typography>
          <Typography component="h3" variant="h6">
            Sign In
          </Typography>
          <Box
            component="form"
            noValidate
            sx={{ mt: 1 }}
            onSubmit={handleSubmit}
            // sx={{
            //   ".MuiInputBase-formControl  .MuiInputBase-input":
            //   {
            //     height: "25px",
            //     backgroundColor:'yellow'
            //   },
            // }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
              validate={validateLoginEmail}
            />
            {/* <PasswordInput label="Password"  source="password" variant="outlined" 
                        // validate={[required(), validateComplexPass()]}
                        fullWidth/> */}

            {/* <TextField
              required
              fullWidth
              source="password"
              name="password"
              label="Password"
              id="password"
              type="password"
              onChange={e => setPassword(e.target.value)}
            /> */}

            <TextField
              source="password"
              name="password"
              type={showPassword ? "text" : "password"}
              id="password"
              style={{ width: "325px" }}
              className=" px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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

            {/* Todo: Use password input */}
            {/* <PasswordInput source="password" name="password" inputProps={{ autocomplete: 'current-password' }} /> */}

            <FormControlLabel
              control={<Checkbox value="remember" color="primary" />}
              label="Remember me"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign In
            </Button>
            <Grid container>
              <Grid item xs>
                <Link href="/#/forgot-password" variant="body2">
                  Forgot password?
                </Link>
              </Grid>
              <Grid item>
                <Link href="/#/signup" variant="body2">
                  {"Sign Up"}
                </Link>
              </Grid>
            </Grid>
            <Grid container justifyContent="center">
              <Grid item>
                <Box
                  sx={{
                    mt: "15px",
                    border: "1px solid #b1e7e9",
                    backgroundColor: "#dff0f0",
                    color: "#000",
                    borderRadius: "5px",
                    padding: "10px",
                    textAlign: "center",
                  }}
                >
                  <Link
                    href="https://putforshare.com/contact-us"
                    variant="body2"
                  >
                    {"Trouble with login ? take a picture and send us"}
                  </Link>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
        {/* <Copyright sx={{ mt: 8, mb: 4 }} /> */}
      </Container>
    </ThemeProvider>
  );
};
