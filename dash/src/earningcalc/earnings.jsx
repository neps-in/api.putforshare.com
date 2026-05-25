import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import { Link as RouterLink } from "react-router-dom";
import { EarningsGuide } from "./earningsGuide";
import logo from "../assets/pfs-logo-svg-bg-transperant.svg";

const MONEY_FORMAT = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatMoney = (value) => `₹${MONEY_FORMAT.format(Number(value) || 0)}`;

const PublicTopNav = () => (
  <Box
    component="header"
    sx={{
      position: "sticky",
      top: 0,
      zIndex: (theme) => theme.zIndex.appBar,
      backgroundColor: "#007073",
      color: "#fff",
      borderBottom: "1px solid rgba(255,255,255,0.12)",
    }}
  >
    <Box
      sx={{
        height: 60,
        px: { xs: 2, md: 3 },
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
        <Box
          component="img"
          src={logo}
          alt="PutForShare"
          sx={{
            width: 38,
            height: 38,
            objectFit: "contain",
            backgroundColor: "#fff",
            borderRadius: 1,
            p: 0.25,
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
            PutForShare
          </Typography>
          <Typography sx={{ fontSize: 10, lineHeight: 1.2, opacity: 0.9 }}>
            Share Books Earn Money
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
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
          }}
        >
          <HelpOutlineOutlinedIcon />
        </IconButton>
        <Button
          component={RouterLink}
          to="/login"
          sx={{ color: "#fff", display: { xs: "none", sm: "inline-flex" } }}
        >
          Login
        </Button>
        <Button
          component={RouterLink}
          to="/signup"
          variant="contained"
          sx={{
            backgroundColor: "#0A4A47",
            "&:hover": { backgroundColor: "#083B39" },
          }}
        >
          Signup Now
        </Button>
      </Box>
    </Box>
  </Box>
);

export const ProfitableOptionBox = ({ mostProfitable, smartSell, selfSell }) => {
  const difference = Math.abs(
    parseFloat(smartSell.customer_earning || 0) -
      parseFloat(selfSell.customer_earning || 0),
  );

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid #b9d8d7",
        borderRadius: 3,
        background:
          "linear-gradient(180deg, rgba(236,253,245,0.95) 0%, rgba(255,255,255,1) 100%)",
      }}
    >
      <CardContent sx={{ p: 2.5, textAlign: "center" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#0a4a47" }}>
          Most Profitable Option
        </Typography>
        <Typography
          sx={{
            mt: 0.5,
            fontSize: 28,
            lineHeight: 1.1,
            fontWeight: 800,
            color: "#083b39",
          }}
        >
          {mostProfitable || "-"}
        </Typography>
        <Typography sx={{ mt: 1, color: "#334155" }}>
          Difference in earnings:{" "}
          <Box component="strong" sx={{ color: "#0a4a47" }}>
            {formatMoney(difference)}
          </Box>
        </Typography>
      </CardContent>
    </Card>
  );
};

const CalculationCard = ({ title, tone, details, earningLabel, earningValue }) => (
  <Card
    elevation={0}
    sx={{
      height: "100%",
      border: `1px solid ${tone.border}`,
      borderRadius: 3,
      background:
        tone.background ||
        "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: tone.title }}>
            {title}
          </Typography>
          <Chip
            label={tone.badge}
            size="small"
            sx={{
              fontWeight: 700,
              color: tone.chipColor,
              backgroundColor: tone.chipBg,
            }}
          />
        </Box>

        <Divider sx={{ borderColor: "rgba(15,23,42,0.08)" }} />

        <Stack spacing={0.75}>
          {details.map((item) => (
            <Box
              key={item.label}
              sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2 }}
            >
              <Typography sx={{ fontSize: 13.5, color: "#475569" }}>
                {item.label}
              </Typography>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Divider sx={{ borderColor: "rgba(15,23,42,0.08)" }} />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>
            {earningLabel}
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: tone.title }}>
            {earningValue}
          </Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

export const Earnings = () => {
  const [productPrice, setProductPrice] = useState("");
  const [quantity] = useState(1);
  const [selfSell, setSelfSell] = useState({});
  const [smartSell, setSmartSell] = useState({});
  const [mostProfitable, setMostProfitable] = useState("");

  useEffect(() => {
    document.title = "Earning Calculator | PutForShare";
  }, []);

  useEffect(() => {
    if (productPrice > 0 && quantity > 0) {
      calculateEarnings(productPrice);
    } else {
      setSelfSell({});
      setSmartSell({});
      setMostProfitable("");
    }
    // quantity stays fixed at 1 in this UI, so the price is the only live input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productPrice]);

  const calculateEarnings = (priceValue) => {
    const price = parseFloat(priceValue);

    if (Number.isNaN(price) || price <= 0) {
      setSelfSell({});
      setSmartSell({});
      setMostProfitable("");
      return;
    }

    let selfReferralRate = 0.145;
    if (price <= 500) selfReferralRate = 0.145;
    else if (price <= 1000) selfReferralRate = 0.125;
    else selfReferralRate = 0.105;

    const selfReferral = price * selfReferralRate * quantity;
    const selfGateway = price * 0.02 * quantity;
    const selfPackagingFees = 10 * quantity;
    const selfTotal = selfReferral + selfGateway + selfPackagingFees;
    const selfEarning = price * quantity - (selfReferral + selfGateway);

    setSelfSell({
      referral_fees: selfReferral,
      payment_gateway_fees: selfGateway,
      packaging_fees: selfPackagingFees,
      total_fees: selfTotal,
      customer_earning: selfEarning,
    });

    let smartReferral = 0;
    if (price <= 500) smartReferral = price * 0.3;
    else if (price <= 1000) smartReferral = price * 0.25;
    else smartReferral = price * 0.2;

    smartReferral *= quantity;

    const smartGateway = price * 0.02 * quantity;
    const smartPackagingFees = 10 * quantity;
    const smartTotal = smartReferral + smartGateway + smartPackagingFees;
    const smartEarning = price * quantity - smartTotal;

    setSmartSell({
      referral_fees: smartReferral,
      payment_gateway_fees: smartGateway,
      packaging_fees: smartPackagingFees,
      total_fees: smartTotal,
      customer_earning: smartEarning,
    });

    setMostProfitable(smartEarning > selfEarning ? "Smart Sell" : "Self Sell");
  };

  const comparisonTone = useMemo(
    () => ({
      self: {
        title: "#0f172a",
        border: "#d7dee8",
        badge: "Manual",
        chipBg: "#eef2ff",
        chipColor: "#3730a3",
      },
      smart: {
        title: "#0a4a47",
        border: "#b9d8d7",
        badge: "Automated",
        chipBg: "#dcfce7",
        chipColor: "#166534",
      },
    }),
    [],
  );

  const hasData = selfSell.total_fees !== undefined && smartSell.total_fees !== undefined;

  const selfDetails = [
    { label: "Referral fees", value: formatMoney(selfSell.referral_fees) },
    { label: "Payment gateway", value: formatMoney(selfSell.payment_gateway_fees) },
    { label: "Packaging + handling", value: formatMoney(selfSell.packaging_fees) },
    { label: "Total fees", value: formatMoney(selfSell.total_fees) },
  ];

  const smartDetails = [
    { label: "Referral fees", value: formatMoney(smartSell.referral_fees) },
    { label: "Payment gateway", value: formatMoney(smartSell.payment_gateway_fees) },
    { label: "Packaging + handling", value: formatMoney(smartSell.packaging_fees) },
    { label: "Total fees", value: formatMoney(smartSell.total_fees) },
  ];

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg, #f5f7fa 0%, #ffffff 100%)" }}>
      <PublicTopNav />
      <Box sx={{ px: { xs: 2, md: 3 }, pb: 4, pt: 3 }}>
        <Box
        sx={{
          mb: 3,
          p: { xs: 2, md: 3 },
          borderRadius: 4,
          border: "1px solid #cde6e5",
          background:
            "radial-gradient(circle at top left, rgba(10,74,71,0.10), transparent 30%), linear-gradient(135deg, rgba(236,253,245,1) 0%, rgba(255,255,255,1) 55%, rgba(248,250,252,1) 100%)",
          boxShadow: "0 12px 40px rgba(15,23,42,0.06)",
        }}
      >
        <Stack spacing={1}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, color: "#0a4a47" }}>
            EARNING CALCULATOR
          </Typography>
          <Typography sx={{ fontSize: { xs: 28, md: 36 }, lineHeight: 1.05, fontWeight: 800, color: "#083b39" }}>
            Compare Self Sell and Smart Sell before you list.
          </Typography>
          <Typography sx={{ maxWidth: 760, fontSize: 14.5, color: "#475569" }}>
            Enter a product price to see fees, earnings, and the recommended selling path at a glance.
          </Typography>
        </Stack>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={7}>
            <Stack spacing={3}>
            <Card
              elevation={0}
              sx={{
                border: "1px solid #d7dee8",
                borderRadius: 3,
                backgroundColor: "#fff",
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                    <Box>
                      <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                        Price input
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: "#64748b" }}>
                        Quantity is fixed to 1 in this dashboard calculator.
                      </Typography>
                    </Box>
                    <Chip
                      label={quantity === 1 ? "Single item" : `Qty ${quantity}`}
                      sx={{ fontWeight: 700, backgroundColor: "#f1f5f9" }}
                    />
                  </Box>

                  <TextField
                    label="Product Price"
                    type="number"
                    value={productPrice}
                    onChange={(event) => setProductPrice(event.target.value)}
                    fullWidth
                    placeholder="Enter price in INR"
                    inputProps={{ min: 0, step: "0.01" }}
                  />

                  {!hasData ? (
                    <Alert severity="info" variant="outlined">
                      Enter a valid product price to calculate the earnings split.
                    </Alert>
                  ) : (
                    <ProfitableOptionBox
                      mostProfitable={mostProfitable}
                      smartSell={smartSell}
                      selfSell={selfSell}
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <CalculationCard
                  title="Self Sell"
                  tone={comparisonTone.self}
                  details={selfDetails}
                  earningLabel="Your earnings"
                  earningValue={formatMoney(selfSell.customer_earning)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <CalculationCard
                  title="Smart Sell"
                  tone={comparisonTone.smart}
                  details={smartDetails}
                  earningLabel="Your earnings"
                  earningValue={formatMoney(smartSell.customer_earning)}
                />
              </Grid>
            </Grid>
            </Stack>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Stack spacing={3}>
            <EarningsGuide />
            <Card elevation={0} sx={{ border: "1px solid #d7dee8", borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#0f172a", mb: 1 }}>
                  How the calculator works
                </Typography>
                <Stack spacing={1.25} sx={{ color: "#475569", fontSize: 13.5 }}>
                  <Typography sx={{ fontSize: 13.5, color: "#475569" }}>
                    1. Self Sell uses a lower referral rate that changes by price band.
                  </Typography>
                  <Typography sx={{ fontSize: 13.5, color: "#475569" }}>
                    2. Smart Sell applies a higher referral fee but keeps the same gateway and packaging costs.
                  </Typography>
                  <Typography sx={{ fontSize: 13.5, color: "#475569" }}>
                    3. The highlighted card shows the option with the better net earnings for the selected price.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export const EarningsPage = () => <Earnings />;
