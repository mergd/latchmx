import type { BuildingConfig } from "@/config/types";

const solaire: BuildingConfig = {
  id: "solaire",
  match: {
    buildingIds: [37112],
    nameIncludes: ["solaire", "299 fremont", "fremont"],
  },
  show: [
    "Front Desk Lobby Pin Pad",
    "Main Entrance",
    "Main Entrance- Fremont Street",
    "1st Floor Elevator Panel 1",
    "1st Floor Elevator Panel 2",
    "Alleyway Courtyard",
    "Courtyard Entrance to Mail Room",
    "Folsom Street Courtyard",
    "Elevator Garage A & Elevator Garage B",
    "Garage Level Elevator Lobby",
    "Garage Level Stairwell",
    "Loading Dock Elevator",
    "Loading Dock Entry",
    "6th Floor Fitness Center",
    "6th Floor Resident Lounge",
    "6th Floor Yoga Studio",
    "8th Floor BBQ & Spa",
    "33rd Floor Rooftop",
    "Bike Repair",
    "Bike Storage",
    "Pet Grooming Station",
    "Town House Trash Room",
  ],
  displayName: "Solaire",
  address: "299 Fremont",
  hero: {
    uri: "https://bmx.fldr.zip/buildings/solaire.jpg?v=2",
  },
  groups: [
    {
      id: "entrance",
      label: "Entrance",
      match: ["main entrance", "front desk", "vestibule"],
    },
    {
      id: "lobby",
      label: "Elevators",
      match: ["lobby", "1st floor"],
    },
    {
      id: "courtyard",
      label: "Courtyard",
      match: ["courtyard", "alleyway", "folsom"],
    },
    {
      id: "garage",
      label: "Garage",
      match: ["garage", "loading dock", "parking"],
    },
    {
      id: "floor6",
      label: "6th floor",
      match: ["6th", "floor 6", "sixth", "yoga", "fitness"],
    },
    {
      id: "floor8",
      label: "8th floor",
      match: ["8th", "eighth", "bbq"],
    },
    {
      id: "rooftop",
      label: "Rooftop",
      match: ["rooftop", "33rd", "fl 33"],
    },
    {
      id: "bike",
      label: "Bike",
      match: ["bike"],
    },
  ],
};

export default solaire;
