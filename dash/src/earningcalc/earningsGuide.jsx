import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

export const EarningsGuide = () => (
  <Card
    elevation={0}
    sx={{
      border: "1px solid #cde6e5",
      borderRadius: 3,
      background:
        "linear-gradient(180deg, rgba(240,252,251,0.95) 0%, rgba(255,255,255,1) 100%)",
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Stack spacing={1.25}>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#0a4a47" }}>
            Quick guide
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 13.5, color: "#475569" }}>
            Use this before choosing a selling mode for a book listing.
          </Typography>
        </Box>

        <Stack component="ul" spacing={1} sx={{ m: 0, pl: 2.25, color: "#334155" }}>
          <Box component="li">
            Prices at or below 500 use the highest Self Sell referral rate band.
          </Box>
          <Box component="li">
            Smart Sell is useful when you want PutForShare to manage the sale flow.
          </Box>
          <Box component="li">
            Packaging and payment gateway fees are included in both calculations.
          </Box>
        </Stack>
      </Stack>
    </CardContent>
  </Card>
);

