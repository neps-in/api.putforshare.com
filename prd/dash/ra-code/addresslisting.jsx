import { useState } from "react";
import { CreateButton, List, TopToolbar, useGetList } from "react-admin";
import { ModuleHeading } from "../layout/ModuleHeading";
import { EmptyPageTeaser } from "../layout/emptypageteaser";
import { PfsLoading } from "../layout/pfsLoading";
import { AddressCard } from "./addresscard";

import { Box, Card } from "@mui/material";

const AddressCreateButton = () => <CreateButton label="Add address" />;

const AddressListActions = () => (
  <TopToolbar>
    <AddressCreateButton />
  </TopToolbar>
);

export const SimpleAddressList = () => {
  const [filter, setFilter] = useState("");
  // const [page, setPage] = useState(1);
  // const perPage = 1;
  // const { data, isLoading } = useGetList('address/my');

  //const { list_data } = useListContext();

  const { data, pageInfo, total, isLoading, error } = useGetList("address/my", {
    filter: { q: filter },
    pagination: { page: 1, perPage: 5 },
    sort: { field: "created_on", order: "DESC" },
  });
  console.log("--------------------");
  console.log(data);

  if (isLoading) return <PfsLoading />;

  if (!data.length)
    return (
      <EmptyPageTeaser oneliner="No shipping address / pickup address found. Please add your address here" />
    );

  // if (isLoading) {
  //     return <div>Loading...</div>;
  // }
  // if (error) {
  //     return <div>Error occured</div>
  // }
  //const { hasNextPage, hasPrevPage } = pageInfo;
  // const getNextPage = () => setPage(page + 1);
  // const getPrevPage = () => setPage(page - 1);

  return (
    <div>
      <ModuleHeading
        heading="My Addresses"
        brief="You can add your address. These addresses will be used for both Pickup and Delivery."
      />
      <AddressListActions />
      {/* <TextField
                label="Search"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                variant="outlined"
                size="small"
                sx={{"width": "400px"}}
                margin="dense"
            /> */}
      <Card>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            "& > :not(style)": {
              m: 4,
              p: 2,
              flexDirection: "column",
              flexGrow: 0,
              flexShrink: 1,
              flexBasis: "auto",
            },
          }}
        >
          {data.map((address) => (
            // Pass address object as record, so that we can do edit
            // <AddressPaper {...address} record={address} />
            // <AddressCard record={address} />
            <AddressCard {...address} key={address.id} record={address} />
          ))}
        </Box>
      </Card>
    </div>
  );
};

const MyAddressSimpleList = () => (
  <List
    emptyWhileLoading
    empty={<EmptyPageTeaser oneliner="Please add your address here" />}
  >
    <SimpleAddressList />
  </List>
);
