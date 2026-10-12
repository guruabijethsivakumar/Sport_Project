export interface CityOption {
  key: string;
  name: string;
  stateCountry: string;
  label: string;
  coordinates: [number, number]; // [lng, lat]
}

/**
 * Standard city location catalog.
 * First city is Chennai as specified.
 */
export const CITIES_CATALOG: CityOption[] = [
  {
    key: 'chennai',
    name: 'Chennai',
    stateCountry: 'Tamil Nadu, India',
    label: 'Chennai, Tamil Nadu',
    coordinates: [80.27, 13.08],
  },
  {
    key: 'bengaluru',
    name: 'Bengaluru',
    stateCountry: 'Karnataka, India',
    label: 'Bengaluru, Karnataka',
    coordinates: [77.59, 12.97],
  },
  {
    key: 'mumbai',
    name: 'Mumbai',
    stateCountry: 'Maharashtra, India',
    label: 'Mumbai, Maharashtra',
    coordinates: [72.88, 19.08],
  },
  {
    key: 'hyderabad',
    name: 'Hyderabad',
    stateCountry: 'Telangana, India',
    label: 'Hyderabad, Telangana',
    coordinates: [78.49, 17.39],
  },
  {
    key: 'delhi',
    name: 'Delhi / NCR',
    stateCountry: 'Delhi, India',
    label: 'Delhi / NCR',
    coordinates: [77.10, 28.70],
  },
  {
    key: 'kolkata',
    name: 'Kolkata',
    stateCountry: 'West Bengal, India',
    label: 'Kolkata, West Bengal',
    coordinates: [88.36, 22.57],
  },
  {
    key: 'pune',
    name: 'Pune',
    stateCountry: 'Maharashtra, India',
    label: 'Pune, Maharashtra',
    coordinates: [73.86, 18.52],
  },
  {
    key: 'london',
    name: 'London',
    stateCountry: 'United Kingdom',
    label: 'London, UK',
    coordinates: [-0.13, 51.51],
  },
  {
    key: 'new_york',
    name: 'New York',
    stateCountry: 'NY, USA',
    label: 'New York, USA',
    coordinates: [-74.01, 40.71],
  },
  {
    key: 'singapore',
    name: 'Singapore',
    stateCountry: 'Singapore',
    label: 'Singapore',
    coordinates: [103.82, 1.35],
  },
];
