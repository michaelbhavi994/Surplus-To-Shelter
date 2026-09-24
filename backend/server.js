const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

/* =========================================================
   DONATIONS
========================================================= */

let donations = [];

/* =========================================================
   NGO DATABASE
========================================================= */

const ngos = [
  {
    id: 1,
    name: "Annapurna Shelter",
    location: "C-Scheme, Jaipur",
    area: "C-Scheme",
    capacity: 50,
    need: "high",
  },

  {
    id: 2,
    name: "Feeding Hands Jaipur",
    location: "Vaishali Nagar, Jaipur",
    area: "Vaishali Nagar",
    capacity: 30,
    need: "medium",
  },

  {
    id: 3,
    name: "Community Food Shelter",
    location: "Malviya Nagar, Jaipur",
    area: "Malviya Nagar",
    capacity: 40,
    need: "high",
  },

  {
    id: 4,
    name: "Seva Kitchen Jaipur",
    location: "Bani Park, Jaipur",
    area: "Bani Park",
    capacity: 60,
    need: "high",
  },

  {
    id: 5,
    name: "Hope Community Centre",
    location: "Jagatpura, Jaipur",
    area: "Jagatpura",
    capacity: 35,
    need: "medium",
  },

  {
    id: 6,
    name: "Roti Bank Jaipur",
    location: "Mansarovar, Jaipur",
    area: "Mansarovar",
    capacity: 45,
    need: "high",
  },

  {
    id: 7,
    name: "Sahara Community Shelter",
    location: "Sodala, Jaipur",
    area: "Sodala",
    capacity: 25,
    need: "medium",
  },
];

/* =========================================================
   DRIVERS
========================================================= */

const drivers = [
  {
    id: 1,
    name: "Rahul",
    phone: "9876543210",
    gender: "male",
    status: "AVAILABLE",
    currentArea: "C-Scheme",
    headingTo: "",
    route: [],
    routeIndex: 0,
    eta: 0,
    distance: 0,
  },

  {
    id: 2,
    name: "Aman",
    phone: "9876543211",
    gender: "male",
    status: "AVAILABLE",
    currentArea: "Vaishali Nagar",
    headingTo: "",
    route: [],
    routeIndex: 0,
    eta: 0,
    distance: 0,
  },

  {
    id: 3,
    name: "Priya",
    phone: "9876543212",
    gender: "female",
    status: "AVAILABLE",
    currentArea: "Malviya Nagar",
    headingTo: "",
    route: [],
    routeIndex: 0,
    eta: 0,
    distance: 0,
  },

  {
    id: 4,
    name: "Neha",
    phone: "9876543213",
    gender: "female",
    status: "AVAILABLE",
    currentArea: "Mansarovar",
    headingTo: "",
    route: [],
    routeIndex: 0,
    eta: 0,
    distance: 0,
  },

  {
    id: 5,
    name: "Vikas",
    phone: "9876543214",
    gender: "male",
    status: "AVAILABLE",
    currentArea: "Jagatpura",
    headingTo: "",
    route: [],
    routeIndex: 0,
    eta: 0,
    distance: 0,
  },
];

/* =========================================================
   ROUTE DATA

   Route starts from DONOR LOCATION.
========================================================= */

const areaRoutes = {
  "C-Scheme": [
    "C-Scheme",
    "MI Road",
    "Bani Park",
    "Sindhi Camp",
  ],

  "Bani Park": [
    "Bani Park",
    "Collectorate Circle",
    "Chandpole",
    "Station Road",
  ],

  "Vaishali Nagar": [
    "Vaishali Nagar",
    "Sodala",
    "Shyam Nagar",
    "Ajmer Road",
  ],

  "Malviya Nagar": [
    "Malviya Nagar",
    "Jawahar Circle",
    "Durgapura",
    "Tonk Road",
  ],

  "Jagatpura": [
    "Jagatpura",
    "Mahal Road",
    "Pratap Nagar",
    "Tonk Road",
  ],

  "Mansarovar": [
    "Mansarovar",
    "New Sanganer Road",
    "Sodala",
    "Shyam Nagar",
  ],

  "Sodala": [
    "Sodala",
    "Ajmer Road",
    "Civil Lines",
  ],
};

/* =========================================================
   NORMALIZE LOCATION
========================================================= */

function normalizeLocation(location) {
  if (!location) {
    return "";
  }

  return location
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/* =========================================================
   DETECT AREA FROM USER INPUT
========================================================= */

function detectArea(location) {
  const value =
    normalizeLocation(location);

  const areas = [
    "c-scheme",
    "c scheme",
    "bani park",
    "vaishali nagar",
    "malviya nagar",
    "jagatpura",
    "mansarovar",
    "sodala",
  ];

  for (const area of areas) {
    if (value.includes(area)) {
      if (
        area === "c scheme" ||
        area === "c-scheme"
      ) {
        return "C-Scheme";
      }

      return area
        .split(" ")
        .map(
          (word) =>
            word.charAt(0).toUpperCase() +
            word.slice(1)
        )
        .join(" ");
    }
  }

  return location;
}

/* =========================================================
   FIND MATCHING NGO
========================================================= */

function findBestNGO(
  donationLocation,
  quantity
) {
  const area =
    detectArea(donationLocation);

  /*
    First priority:
    Exact area match.
  */

  const exactNGO = ngos.find(
    (ngo) =>
      ngo.area.toLowerCase() ===
        String(area).toLowerCase() &&
      ngo.capacity >= quantity
  );

  if (exactNGO) {
    return exactNGO;
  }

  /*
    Second priority:
    Nearby suitable NGO.
  */

  const suitableNGOs =
    ngos.filter(
      (ngo) =>
        ngo.capacity >= quantity
    );

  if (
    suitableNGOs.length === 0
  ) {
    return null;
  }

  /*
    Prefer high-need NGO.
  */

  const highNeed =
    suitableNGOs.filter(
      (ngo) =>
        ngo.need === "high"
    );

  if (highNeed.length > 0) {
    return highNeed[0];
  }

  return suitableNGOs[0];
}

/* =========================================================
   CREATE ROUTE

   Donor location is ALWAYS the first point.
========================================================= */

function createRoute(
  donorLocation,
  ngo
) {
  const donorArea =
    detectArea(donorLocation);

  let route =
    areaRoutes[donorArea];

  if (!route) {
    route = [
      donorArea,
      "Main Road",
      "Jaipur City",
    ];
  }

  /*
    Remove duplicate NGO
    if already present.
  */

  route = route.filter(
    (place) =>
      place.toLowerCase() !==
      ngo.name.toLowerCase()
  );

  /*
    NGO is ALWAYS final destination.
  */

  route.push(ngo.name);

  return route;
}

/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {
  res.json({
    message:
      "Surplus-to-Shelter Backend is Running!",
  });
});

/* =========================================================
   GET DONATIONS
========================================================= */

app.get(
  "/api/donations",
  (req, res) => {
    res.json(donations);
  }
);

/* =========================================================
   CREATE DONATION
========================================================= */

app.post(
  "/api/donations",
  (req, res) => {
    const donation = {
      id: Date.now(),

      foodType:
        req.body.foodType,

      quantity: Number(
        req.body.quantity
      ),

      location:
        req.body.location,

      expiryTime:
        req.body.expiryTime,

      status: "POSTED",

      matchedNGO: null,

      driver: null,

      route: [],
    };

    donations.push(donation);

    res.status(201).json({
      message:
        "Donation posted successfully!",

      donation,
    });
  }
);

/* =========================================================
   GET NGOs
========================================================= */

app.get(
  "/api/ngos",
  (req, res) => {
    res.json(ngos);
  }
);

/* =========================================================
   MATCH NGO
========================================================= */

app.post(
  "/api/match/:donationId",
  (req, res) => {

    const donationId =
      Number(req.params.donationId);

    const donation =
      donations.find(
        (item) =>
          item.id === donationId
      );

    if (!donation) {
      return res.status(404).json({
        message:
          "Donation not found",
      });
    }

    const matchedNGO =
      findBestNGO(
        donation.location,
        donation.quantity
      );

    if (!matchedNGO) {
      return res.status(404).json({
        message:
          "No suitable NGO found for this quantity",
      });
    }

    /*
      Create route based on
      donor pickup location.
    */

    const route =
      createRoute(
        donation.location,
        matchedNGO
      );

    donation.status =
      "MATCHED";

    donation.matchedNGO =
      matchedNGO;

    donation.route =
      route;

    res.json({
      message:
        "Donation matched successfully!",

      donation,

      matchedNGO,

      route,
    });
  }
);

/* =========================================================
   GET DRIVERS
========================================================= */

app.get(
  "/api/drivers",
  (req, res) => {
    res.json(
      drivers.filter(
        (driver) =>
          driver.status ===
          "AVAILABLE"
      )
    );
  }
);

/* =========================================================
   ASSIGN DRIVER
========================================================= */

app.post(
  "/api/assign-driver/:donationId",
  (req, res) => {

    const donationId =
      Number(req.params.donationId);

    const donation =
      donations.find(
        (item) =>
          item.id === donationId
      );

    if (!donation) {
      return res.status(404).json({
        message:
          "Donation not found",
      });
    }

    if (!donation.matchedNGO) {
      return res.status(400).json({
        message:
          "NGO has not been assigned yet",
      });
    }

    const driver =
      drivers.find(
        (item) =>
          item.status ===
          "AVAILABLE"
      );

    if (!driver) {
      return res.status(404).json({
        message:
          "No driver available",
      });
    }

    /*
      Driver is placed at
      DONOR PICKUP LOCATION.

      He/she will NOT move
      until pickup is confirmed.
    */

    const route =
      donation.route.length > 0
        ? donation.route
        : createRoute(
            donation.location,
            donation.matchedNGO
          );

    driver.status =
      "WAITING FOR PICKUP";

    driver.currentArea =
      route[0];

    driver.headingTo =
      "Pickup Location";

    driver.route =
      route;

    driver.routeIndex = 0;

    driver.eta = 0;

    driver.distance = 0;

    donation.driver = {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      gender: driver.gender,
      status: driver.status,
      currentArea:
        driver.currentArea,
      headingTo:
        driver.headingTo,
      routeIndex:
        driver.routeIndex,
      eta: driver.eta,
      distance:
        driver.distance,
    };

    donation.status =
      "DRIVER ASSIGNED";

    res.json({
      message:
        "Driver assigned successfully!",

      donation,

      driver: donation.driver,
    });
  }
);

/* =========================================================
   DRIVER LOCATION
========================================================= */

app.put(
  "/api/driver-location/:donationId",
  (req, res) => {

    const donationId =
      Number(req.params.donationId);

    const donation =
      donations.find(
        (item) =>
          item.id === donationId
      );

    if (
      !donation ||
      !donation.driver
    ) {
      return res.status(404).json({
        message:
          "Driver not found",
      });
    }

    const driver =
      drivers.find(
        (item) =>
          item.id ===
          donation.driver.id
      );

    if (!driver) {
      return res.status(404).json({
        message:
          "Driver not found",
      });
    }

    const route =
      driver.route ||
      donation.route;

    /* =====================================================
       WAITING FOR PICKUP
    ===================================================== */

    if (
      donation.status ===
      "DRIVER ASSIGNED"
    ) {

      driver.status =
        "WAITING FOR PICKUP";

      driver.currentArea =
        route[0];

      driver.headingTo =
        "Pickup Location";

      driver.routeIndex = 0;

      driver.eta = 0;

      driver.distance = 0;

      donation.driver = {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        gender: driver.gender,
        status: driver.status,
        currentArea:
          driver.currentArea,
        headingTo:
          driver.headingTo,
        routeIndex:
          driver.routeIndex,
        eta: driver.eta,
        distance:
          driver.distance,
      };

      return res.json({
        message:
          "Driver is waiting for pickup",

        donation,
      });
    }

    /* =====================================================
       MOVING AFTER PICKUP
    ===================================================== */

    if (
      donation.status ===
      "PICKED UP"
    ) {

      driver.status =
        "ON THE WAY";

      /*
        Move one point forward
        every 3 seconds.
      */

      if (
        driver.routeIndex <
        route.length - 1
      ) {
        driver.routeIndex++;
      }

      driver.currentArea =
        route[
          driver.routeIndex
        ];

      /*
        Show NEXT location.

        Example:

        Near: MI Road
        Heading to: Bani Park
      */

      if (
        driver.routeIndex <
        route.length - 1
      ) {
        driver.headingTo =
          route[
            driver.routeIndex + 1
          ];
      } else {
        driver.headingTo =
          "Arrived at NGO";
      }

      const totalSteps =
        route.length - 1;

      const remainingSteps =
        totalSteps -
        driver.routeIndex;

      driver.eta =
        Math.max(
          0,
          remainingSteps * 4
        );

      driver.distance =
        Number(
          Math.max(
            0,
            remainingSteps * 1.1
          ).toFixed(1)
        );

      /*
        ARRIVED
      */

      if (
        driver.routeIndex >=
        route.length - 1
      ) {

        driver.currentArea =
          route[
            route.length - 1
          ];

        driver.headingTo =
          "Arrived at NGO";

        driver.eta = 0;

        driver.distance = 0;

        driver.status =
          "ARRIVED";
      }

      donation.driver = {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        gender: driver.gender,
        status: driver.status,
        currentArea:
          driver.currentArea,
        headingTo:
          driver.headingTo,
        routeIndex:
          driver.routeIndex,
        eta: driver.eta,
        distance:
          driver.distance,
      };

      return res.json({
        message:
          "Driver location updated",

        donation,
      });
    }

    res.json({
      message:
        "No movement required",

      donation,
    });
  }
);

/* =========================================================
   UPDATE DONATION STATUS
========================================================= */

app.put(
  "/api/donation-status/:donationId",
  (req, res) => {

    const donationId =
      Number(req.params.donationId);

    const newStatus =
      req.body.status;

    const donation =
      donations.find(
        (item) =>
          item.id === donationId
      );

    if (!donation) {
      return res.status(404).json({
        message:
          "Donation not found",
      });
    }

    /* =====================================================
       PICKED UP
    ===================================================== */

    if (
      newStatus === "PICKED UP"
    ) {

      donation.status =
        "PICKED UP";

      if (donation.driver) {

        const driver =
          drivers.find(
            (item) =>
              item.id ===
              donation.driver.id
          );

        if (driver) {

          const route =
            donation.route;

          driver.status =
            "ON THE WAY";

          driver.route =
            route;

          /*
            Start from donor.
          */

          driver.routeIndex = 0;

          driver.currentArea =
            route[0];

          /*
            First destination.
          */

          if (
            route.length > 1
          ) {
            driver.headingTo =
              route[1];
          } else {
            driver.headingTo =
              donation
                .matchedNGO
                .name;
          }

          const totalSteps =
            route.length - 1;

          driver.eta =
            totalSteps * 4;

          driver.distance =
            Number(
              (
                totalSteps * 1.1
              ).toFixed(1)
            );

          donation.driver = {
            id: driver.id,
            name: driver.name,
            phone: driver.phone,
            gender: driver.gender,
            status: driver.status,
            currentArea:
              driver.currentArea,
            headingTo:
              driver.headingTo,
            routeIndex:
              driver.routeIndex,
            eta: driver.eta,
            distance:
              driver.distance,
          };
        }
      }
    }

    /* =====================================================
       DELIVERED
    ===================================================== */

    if (
      newStatus === "DELIVERED"
    ) {

      donation.status =
        "DELIVERED";

      if (donation.driver) {

        const driver =
          drivers.find(
            (item) =>
              item.id ===
              donation.driver.id
          );

        if (driver) {

          driver.status =
            "AVAILABLE";

          driver.currentArea =
            donation
              .matchedNGO
              .name;

          driver.headingTo =
            "Delivery Completed";

          driver.eta = 0;

          driver.distance = 0;

          donation.driver = {
            id: driver.id,
            name: driver.name,
            phone: driver.phone,
            gender: driver.gender,
            status:
              "DELIVERY COMPLETED",
            currentArea:
              driver.currentArea,
            headingTo:
              driver.headingTo,
            routeIndex:
              driver.routeIndex,
            eta: 0,
            distance: 0,
          };
        }
      }
    }

    res.json({
      message:
        `Donation status updated to ${newStatus}`,

      donation,
    });
  }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );
  }
);