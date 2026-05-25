import { yellow } from "@mui/material/colors";
import { createTheme } from "@mui/material/styles";
import { defaultTheme } from "react-admin";

// -----------------------------------------------------------------------------------------
// Global PFS THEME, anything look and feel change should go here only
const PfsTheme = createTheme({
  ...defaultTheme,
  overrides: {
    "RaLayout-contentWithSidebar": {
      paddingTop: "50px",
    },
    "RaLayout-content": {
      paddingTop: "50px",
      backgroundColor: "#ca9b19",
    },
    "RaFileInput-dropZone": {
      backgroundColor: "#FFEBCD",
    },
  },

  palette: {
    primary: {
      main: "#007073",
    },
    secondary: {
      main: "#fff",
    },
  },

  "& .RaDatagrid-headerCell": {
    backgroundColor: "#007073",
    color: "#ede039",
  },

  "& .RaMenuItemLink-active": {
    backgroundColor: "yellow",
  },

  sidebar: {
    width: 250, // The default value is 240
    closedWidth: 50, // The default value is 55
    backgroundColor: yellow,
  },

  components: {
    MuiListItem: {
      styleOverrides: {
        root: {
          "&.RaMenuItemLink-active": {
            backgroundColor: "green", // <-- Your desired background color
            color: "#000", // Optional: change text color too
          },
        },
      },
    },
  },
});
// -----------------------------------------------------------------------------------------

export default PfsTheme;
