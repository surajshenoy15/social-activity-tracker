import * as Location from "expo-location";

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

export const getFullLocationDetails = async (): Promise<LocationData> => {
  const location = await Location.getCurrentPositionAsync({});

  const address = await Location.reverseGeocodeAsync({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  });

  const formattedAddress =
    address.length > 0
      ? `${address[0].city ?? ""}, ${address[0].region ?? ""}, ${address[0].country ?? ""}`
      : "Unknown Location";

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    address: formattedAddress,
  };
};
