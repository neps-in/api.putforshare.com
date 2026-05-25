import React from "react";
// import { makeStyles } from '@material-ui/core/styles';
import { makeStyles } from "@mui/styles";

import { Card, CardActions, CardContent, Typography } from "@mui/material";
import { DeleteWithConfirmButton, EditButton } from "react-admin";

const useStyles = makeStyles({
  moduleHeading: {
    marginLeft: 20,
  },
  card: {
    margin: 20,
    padding: 10,
    backgroundColor: "#f9f9f9",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  cardHeader: {
    marginBottom: 10,
  },
  cardActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 10,
  },
});

export const AddressCard = (props) => {
  const classes = useStyles();
  const {
    id,
    full_name,
    building_name,
    area_sector,
    mobile_num,
    company_name,
    landmark,
    town_city,
    state_region,
    pincode,
    record,
  } = props;

  return (
    <Card key={id} className={classes.card}>
      <CardContent className={classes.cardContent}>
        <Typography variant="h6" component="h2" className={classes.cardHeader}>
          {full_name} - {mobile_num}
        </Typography>
        {building_name && (
          <Typography variant="body1">{building_name}</Typography>
        )}
        {company_name && (
          <Typography variant="body1">{company_name}</Typography>
        )}
        {area_sector && <Typography variant="body1">{area_sector}</Typography>}
        {landmark && (
          <Typography variant="body1">Landmark: {landmark}</Typography>
        )}
        {town_city && <Typography variant="body1">{town_city}</Typography>}
        <Typography variant="body1">
          {state_region}&nbsp;&nbsp;{pincode}
        </Typography>
      </CardContent>
      <CardActions className={classes.cardActions}>
        <EditButton basePath="/address" record={record} />
        <DeleteWithConfirmButton record={record} />
      </CardActions>
    </Card>
  );
};
