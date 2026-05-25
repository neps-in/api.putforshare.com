import { alpha, createTheme } from "@mui/material/styles";

export const brandTheme = createTheme({
  palette: {
    primary: {
      main: "#007073",
      dark: "#005d60",
      light: "#2f8a8d",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#f4c833",
      dark: "#d6a800",
      light: "#fde68a",
      contrastText: "#262626",
    },
    text: {
      primary: "#262626",
      secondary: "#424242",
    },
    background: {
      default: "#f3f9f9",
      paper: "#ffffff",
    },
    error: {
      main: "#731d00",
      light: "#fff1ec",
      dark: "#561400",
    },
    warning: {
      main: "#f4c833",
      light: "#fff8d8",
      dark: "#d6a800",
    },
    success: {
      main: "#007073",
      light: "#d8e6e6",
      dark: "#005d60",
    },
    info: {
      main: "#007073",
      light: "#d8e6e6",
      dark: "#005d60",
    },
    divider: "#d8e6e6",
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: [
      "ui-sans-serif",
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "sans-serif",
    ].join(","),
    h1: {
      fontWeight: 800,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontWeight: 800,
      letterSpacing: "-0.02em",
    },
    h3: {
      fontWeight: 800,
      letterSpacing: "-0.015em",
    },
    h4: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 700,
      textTransform: "none",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#f3f9f9",
          color: "#262626",
        },
        "*::selection": {
          backgroundColor: alpha("#007073", 0.18),
        },
        ".RaDatagrid-headerCell": {
          backgroundColor: "#007073",
          color: "#ede039",
        },
        ".RaMenuItemLink-active": {
          backgroundColor: "#f4c833",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 10px 28px rgba(0, 112, 115, 0.06)",
          border: "1px solid #d8e6e6",
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          boxShadow: "none",
        },
        containedPrimary: {
          backgroundColor: "#007073",
          "&:hover": {
            backgroundColor: "#005d60",
          },
        },
        outlinedPrimary: {
          borderColor: "#007073",
          color: "#007073",
          "&:hover": {
            borderColor: "#005d60",
            backgroundColor: alpha("#007073", 0.06),
          },
        },
        textPrimary: {
          color: "#007073",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#ffffff",
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#007073",
          },
        },
        notchedOutline: {
          borderColor: "#d8e6e6",
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          "&.Mui-focused": {
            color: "#007073",
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardError: {
          backgroundColor: "#fff1ec",
          color: "#731d00",
        },
        standardInfo: {
          backgroundColor: "#f3f9f9",
          color: "#424242",
        },
        standardSuccess: {
          backgroundColor: "#d8e6e6",
          color: "#005d60",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: "#007073",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: "none",
          backgroundColor: "#ffffff",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "#d8e6e6",
        },
      },
    },
  },
});
