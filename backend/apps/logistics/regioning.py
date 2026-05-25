from __future__ import annotations

REGION_CHOICES = (
    ("North", "North"),
    ("South", "South"),
    ("East", "East"),
    ("West", "West"),
    ("Central", "Central"),
    ("North East", "North East"),
    ("Islands", "Islands"),
    ("Metro", "Metro"),
)

NORTH_EAST_STATES = {
    "ARUNACHAL PRADESH",
    "ASSAM",
    "MANIPUR",
    "MEGHALAYA",
    "MIZORAM",
    "NAGALAND",
    "SIKKIM",
    "TRIPURA",
}

SOUTH_STATES = {
    "ANDHRA PRADESH",
    "KARNATAKA",
    "KERALA",
    "TAMIL NADU",
    "TELANGANA",
    "PONDICHERRY",
}

EAST_STATES = {
    "BIHAR",
    "JHARKHAND",
    "ODISHA",
    "WEST BENGAL",
}

WEST_STATES = {
    "GOA",
    "GUJARAT",
    "MAHARASHTRA",
    "DADRA & NAGAR HAVELI",
    "DAMAN & DIU",
}

CENTRAL_STATES = {
    "MADHYA PRADESH",
    "CHATTISGARH",
}

ISLAND_STATES = {
    "ANDAMAN & NICOBAR ISLANDS",
    "LAKSHADWEEP",
}

NORTH_STATES = {
    "CHANDIGARH",
    "DELHI",
    "HARYANA",
    "HIMACHAL PRADESH",
    "JAMMU & KASHMIR",
    "PUNJAB",
    "RAJASTHAN",
    "UTTAR PRADESH",
    "UTTARAKHAND",
}


METRO_CITY_RULES = (
    ("DELHI", None),
    ("MAHARASHTRA", ("MUMBAI",)),
    ("WEST BENGAL", ("KOLKATA", "CALCUTTA")),
    ("TAMIL NADU", ("CHENNAI",)),
    ("KARNATAKA", ("BENGALURU", "BANGALORE")),
    ("TELANGANA", ("HYDERABAD",)),
    ("MAHARASHTRA", ("PUNE",)),
    ("GUJARAT", ("AHMEDABAD",)),
)


def _normalize(value: str | None) -> str:
    return (value or "").strip().upper()


def is_metro_city(state_name: str | None, district_name: str | None) -> bool:
    state = _normalize(state_name)
    district = _normalize(district_name)
    if not state:
        return False
    for rule_state, rule_keywords in METRO_CITY_RULES:
        if state != rule_state:
            continue
        if rule_keywords is None:
            return True
        if district and any(keyword in district for keyword in rule_keywords):
            return True
    return False


def derive_region(state_name: str | None, district_name: str | None) -> str:
    state = _normalize(state_name)

    if state in NORTH_EAST_STATES:
        return "North East"
    if state in SOUTH_STATES:
        return "South"
    if state in EAST_STATES:
        return "East"
    if state in WEST_STATES:
        return "West"
    if state in CENTRAL_STATES:
        return "Central"
    if state in ISLAND_STATES:
        return "Islands"
    if state in NORTH_STATES:
        return "North"

    # Keep every row in one of the approved buckets.
    return "Central"
