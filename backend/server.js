const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

let donations = [];

const ngos = [
  {
    id: 1,
    name: "Annapurna Shelter",
    location: "C-Scheme, Jaipur",
    capacity: 50,
    need: "high"
  },
  {
    id: 2,
    name: "Feeding Hands Jaipur",
    location: "Vaishali Nagar, Jaipur",
    capacity: 30,
    need: "medium"
  },
  {
    id: 3,
    name: "Community Food Shelter",
    location: "Malviya Nagar, Jaipur",
    capacity: 40,
    need: "high"
  }
];

const drivers = [
  {
    id: 1,
    name: "Rahul",
    phone: "9876543210",
    status: "AVAILABLE",
    currentArea: "C-Scheme",
    routeIndex: 0,
    eta: 15,
    distance: 4.2
  },
  {
    id: 2,
    name: "Aman",
    phone: "9876543211",
    status: "AVAILABLE",
    currentArea: "Vaishali Nagar",
    routeIndex: 0,
    eta: 18,
    distance: 5.1
  },
  {
    id: 3,
    name: "Priya",
    phone: "9876543212",
    status: "AVAILABLE",
    currentArea: "Malviya Nagar",
    routeIndex: 0,
    eta: 12,
    distance: 3.5
  }
];

const route = [
  "C-Scheme",
  "MI Road",
  "Bani Park",
  "Sindhi Camp",
  "Annapurna Shelter"
];

app.get("/", (req, res) => {
  res.json({
    message: "Surplus-to-Shelter Backend is Running!"
  });
});

app.get("/api/donations", (req, res) => {
  res.json(donations);
});

app.post("/api/donations", (req, res) => {
  const donation = {
    id: donations.length + 1,
    foodType: req.body.foodType,
    quantity: Number(req.body.quantity),
    location: req.body.location,
    expiryTime: req.body.expiryTime,
    status: "POSTED",
    matchedNGO: null,
    driver: null
  };

  donations.push(donation);

  console.log("New Donation:", donation);

  res.status(201).json({
    message: "Donation posted successfully!",
    donation
  });
});

app.get("/api/ngos", (req, res) => {
  res.json(ngos);
});

app.post("/api/match/:donationId", (req, res) => {
  const donationId = Number(req.params.donationId);

  const donation = donations.find(
    item => item.id === donationId
  );

  if (!donation) {
    return res.status(404).json({
      message: "Donation not found"
    });
  }

  const suitableNGOs = ngos.filter(
    ngo => ngo.capacity >= donation.quantity
  );

  if (suitableNGOs.length === 0) {
    return res.status(404).json({
      message: "No suitable NGO found"
    });
  }

  const matchedNGO =
    suitableNGOs.find(ngo => ngo.need === "high") ||
    suitableNGOs[0];

  donation.status = "MATCHED";
  donation.matchedNGO = matchedNGO;

  console.log("Donation Matched:", donation);

  res.json({
    message: "Donation matched successfully!",
    donation,
    matchedNGO
  });
});

app.get("/api/drivers", (req, res) => {
  const availableDrivers = drivers.filter(
    driver => driver.status === "AVAILABLE"
  );

  res.json(availableDrivers);
});

app.post("/api/assign-driver/:donationId", (req, res) => {
  const donationId = Number(req.params.donationId);

  const donation = donations.find(
    item => item.id === donationId
  );

  if (!donation) {
    return res.status(404).json({
      message: "Donation not found"
    });
  }

  const driver = drivers.find(
    driver => driver.status === "AVAILABLE"
  );

  if (!driver) {
    return res.status(404).json({
      message: "No driver available"
    });
  }

  driver.status = "ON THE WAY";
  driver.routeIndex = 0;
  driver.currentArea = route[0];
  driver.eta = 15;
  driver.distance = 4.2;

  donation.driver = {
    ...driver
  };

  donation.status = "DRIVER ASSIGNED";

  console.log("Driver Assigned:", driver);

  res.json({
    message: "Driver assigned successfully!",
    donation,
    driver
  });
});

app.put("/api/driver-location/:donationId", (req, res) => {
  const donationId = Number(req.params.donationId);

  const donation = donations.find(
    item => item.id === donationId
  );

  if (!donation || !donation.driver) {
    return res.status(404).json({
      message: "Driver not found"
    });
  }

  const driver = drivers.find(
    item => item.id === donation.driver.id
  );

  if (!driver) {
    return res.status(404).json({
      message: "Driver not found"
    });
  }

  driver.routeIndex++;

  if (driver.routeIndex >= route.length - 1) {
    driver.routeIndex = route.length - 1;
    driver.currentArea = route[route.length - 1];
    driver.eta = 0;
    driver.distance = 0;
  } else {
    driver.currentArea = route[driver.routeIndex];

    driver.eta = Math.max(
      0,
      15 - driver.routeIndex * 4
    );

    driver.distance = Math.max(
      0,
      4.2 - driver.routeIndex * 1.05
    );
  }

  donation.driver = {
    ...driver
  };

  console.log(
    "Driver Area Updated:",
    driver.currentArea
  );

  res.json({
    message: "Driver location updated!",
    donation
  });
});

app.put("/api/donation-status/:donationId", (req, res) => {
  const donationId = Number(req.params.donationId);
  const newStatus = req.body.status;

  const donation = donations.find(
    item => item.id === donationId
  );

  if (!donation) {
    return res.status(404).json({
      message: "Donation not found"
    });
  }

  const allowedStatuses = [
    "PICKED UP",
    "DELIVERED"
  ];

  if (!allowedStatuses.includes(newStatus)) {
    return res.status(400).json({
      message: "Invalid status"
    });
  }

  donation.status = newStatus;

  if (
    newStatus === "DELIVERED" &&
    donation.driver
  ) {
    const driver = drivers.find(
      item => item.id === donation.driver.id
    );

    if (driver) {
      driver.status = "AVAILABLE";
    }
  }

  console.log("Status Updated:", donation);

  res.json({
    message: `Donation status updated to ${newStatus}`,
    donation
  });
});

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});