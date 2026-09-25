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
    vehicleType: "Maruti Swift",
    vehicleNumber: "RJ14 AB 1021",
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
    vehicleType: "Tata Ace",
    vehicleNumber: "RJ14 CD 2845",
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
    vehicleType: "Hyundai i10",
    vehicleNumber: "RJ14 EF 3718",
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
    vehicleType: "Maruti WagonR",
    vehicleNumber: "RJ14 GH 4492",
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
    vehicleType: "Mahindra Bolero",
    vehicleNumber: "RJ14 JK 5630",
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
   HELPERS
========================================================= */

function normalizeLocation(location) {
  if (!location) return "";

  return String(location)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function detectArea(location) {
  const value = normalizeLocation(location);

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
   EXPIRY / URGENCY
========================================================= */

function getExpiryRisk(expiryTime) {
  if (!expiryTime) return "normal";

  const expiry = new Date(expiryTime).getTime();
  const now = Date.now();

  if (Number.isNaN(expiry)) return "normal";

  const hoursRemaining =
    (expiry - now) / (1000 * 60 * 60);

  if (hoursRemaining <= 2) {
    return "urgent";
  }

  if (hoursRemaining <= 4) {
    return "high";
  }

  return "normal";
}

function getNeedWeight(need) {
  if (need === "high") return 3;
  if (need === "medium") return 2;
  return 1;
}

function getUrgencyWeight(risk) {
  if (risk === "urgent") return 3;
  if (risk === "high") return 2;
  return 1;
}

/* =========================================================
   MATCHING ENGINE
========================================================= */

function findBestNGO(
  donationLocation,
  quantity,
  expiryTime
) {
  const area = detectArea(donationLocation);

  const expiryRisk =
    getExpiryRisk(expiryTime);

  const suitableNGOs = ngos.filter(
    (ngo) =>
      ngo.capacity >= Number(quantity)
  );

  if (suitableNGOs.length === 0) {
    return null;
  }

  /*
    Matching priority:

    1. Exact location
    2. Capacity
    3. NGO need
    4. Food urgency
  */

  const scoredNGOs =
    suitableNGOs.map((ngo) => {
      let score = 0;

      if (
        ngo.area.toLowerCase() ===
        String(area).toLowerCase()
      ) {
        score += 50;
      }

      score +=
        getNeedWeight(ngo.need) * 10;

      score +=
        getUrgencyWeight(expiryRisk) * 5;

      /*
        Prefer NGOs with less unused
        capacity when possible.
      */

      const unusedCapacity =
        ngo.capacity -
        Number(quantity);

      score += Math.max(
        0,
        20 - unusedCapacity
      );

      return {
        ngo,
        score,
      };
    });

  scoredNGOs.sort(
    (a, b) => b.score - a.score
  );

  return scoredNGOs[0].ngo;
}

/* =========================================================
   MATCH SCORE
========================================================= */

function calculateMatchScore(
  donation,
  ngo
) {
  if (!donation || !ngo) return 0;

  const donationArea =
    detectArea(donation.location);

  let score = 0;

  if (
    ngo.area.toLowerCase() ===
    String(donationArea).toLowerCase()
  ) {
    score += 40;
  } else {
    score += 15;
  }

  if (
    ngo.capacity >=
    Number(donation.quantity)
  ) {
    score += 25;
  }

  if (ngo.need === "high") {
    score += 20;
  } else if (ngo.need === "medium") {
    score += 10;
  }

  const risk =
    getExpiryRisk(
      donation.expiryTime
    );

  if (risk === "urgent") {
    score += 15;
  } else if (risk === "high") {
    score += 10;
  }

  return Math.min(100, score);
}

/* =========================================================
   ROUTE CREATION
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

  route = route.filter(
    (place) =>
      place.toLowerCase() !==
      ngo.name.toLowerCase()
  );

  route.push(ngo.name);

  return [...route];
}

/* =========================================================
   DRIVER SNAPSHOT
========================================================= */

function getDriverSnapshot(
  driver,
  statusOverride
) {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    gender: driver.gender,
    vehicleType:
      driver.vehicleType,
    vehicleNumber:
      driver.vehicleNumber,
    status:
      statusOverride ||
      driver.status,
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

/* =========================================================
   FIND DONATION
========================================================= */

function findDonation(id) {
  return donations.find(
    (item) =>
      item.id === Number(id)
  );
}

/* =========================================================
   RELEASE DRIVER
========================================================= */

function releaseDriver(driver) {
  if (!driver) return;

  driver.status =
    "AVAILABLE";

  driver.headingTo = "";

  driver.route = [];

  driver.routeIndex = 0;

  driver.eta = 0;

  driver.distance = 0;
}

/* =========================================================
   EDIT / CANCEL CHECKS
========================================================= */

function canEditDonation(
  donation
) {
  return (
    donation.status ===
      "POSTED" ||
    donation.status ===
      "MATCHED"
  );
}

function canCancelDonation(
  donation
) {
  return (
    donation.status !==
      "PICKED UP" &&
    donation.status !==
      "DELIVERED" &&
    donation.status !==
      "CANCELLED"
  );
}

/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {
  res.json({
    message:
      "Surplus-to-Shelter Backend is Running!",
    version: "2.0",
  });
});

/* =========================================================
   GET ALL DONATIONS
========================================================= */

app.get(
  "/api/donations",
  (req, res) => {
    res.json(donations);
  }
);

/* =========================================================
   GET DONATION HISTORY
========================================================= */

app.get(
  "/api/donations/history",
  (req, res) => {
    const history =
      [...donations].sort(
        (a, b) =>
          new Date(
            b.createdAt
          ) -
          new Date(
            a.createdAt
          )
      );

    res.json(history);
  }
);

/* =========================================================
   CREATE DONATION
========================================================= */

app.post(
  "/api/donations",
  (req, res) => {
    const {
      foodType,
      quantity,
      location,
      expiryTime,
    } = req.body;

    if (
      !foodType ||
      !quantity ||
      !location ||
      !expiryTime
    ) {
      return res.status(400).json({
        message:
          "Please provide all donation details.",
      });
    }

    const now =
      new Date().toISOString();

    const donation = {
      id: Date.now(),

      foodType:
        String(foodType).trim(),

      quantity:
        Number(quantity),

      location:
        String(location).trim(),

      expiryTime,

      expiryRisk:
        getExpiryRisk(expiryTime),

      status: "POSTED",

      matchedNGO: null,

      matchScore: 0,

      driver: null,

      route: [],

      createdAt: now,

      updatedAt: now,

      cancelledAt: null,
    };

    donations.push(
      donation
    );

    res.status(201).json({
      message:
        "Donation posted successfully!",

      donation,
    });
  }
);

/* =========================================================
   EDIT DONATION
========================================================= */

app.put(
  "/api/donations/:donationId",
  (req, res) => {
    const donation =
      findDonation(
        req.params.donationId
      );

    if (!donation) {
      return res.status(404).json({
        message:
          "Donation not found.",
      });
    }

    if (
      !canEditDonation(
        donation
      )
    ) {
      return res.status(400).json({
        message:
          "This donation can no longer be edited.",
      });
    }

    const {
      foodType,
      quantity,
      location,
      expiryTime,
    } = req.body;

    if (
      foodType !== undefined
    ) {
      donation.foodType =
        String(foodType).trim();
    }

    if (
      quantity !== undefined
    ) {
      const parsedQuantity =
        Number(quantity);

      if (
        Number.isNaN(
          parsedQuantity
        ) ||
        parsedQuantity <= 0
      ) {
        return res.status(400).json({
          message:
            "Quantity must be a valid positive number.",
        });
      }

      donation.quantity =
        parsedQuantity;
    }

    if (
      location !== undefined
    ) {
      donation.location =
        String(location).trim();
    }

    if (
      expiryTime !== undefined
    ) {
      donation.expiryTime =
        expiryTime;
    }

    donation.expiryRisk =
      getExpiryRisk(
        donation.expiryTime
      );

    /*
      If donation was already matched,
      recalculate the NGO and route.
    */

    if (
      donation.status ===
      "MATCHED"
    ) {
      const newNGO =
        findBestNGO(
          donation.location,
          donation.quantity,
          donation.expiryTime
        );

      if (!newNGO) {
        return res.status(400).json({
          message:
            "No suitable NGO found for the updated donation.",
        });
      }

      donation.matchedNGO =
        newNGO;

      donation.matchScore =
        calculateMatchScore(
          donation,
          newNGO
        );

      donation.route =
        createRoute(
          donation.location,
          newNGO
        );
    }

    donation.updatedAt =
      new Date().toISOString();

    res.json({
      message:
        "Donation updated successfully.",

      donation,
    });
  }
);

/* =========================================================
   CANCEL DONATION
========================================================= */

app.put(
  "/api/donations/:donationId/cancel",
  (req, res) => {
    const donation =
      findDonation(
        req.params.donationId
      );

    if (!donation) {
      return res.status(404).json({
        message:
          "Donation not found.",
      });
    }

    if (
      !canCancelDonation(
        donation
      )
    ) {
      return res.status(400).json({
        message:
          "This donation cannot be cancelled at this stage.",
      });
    }

    /*
      Release driver if one
      was already assigned.
    */

    if (donation.driver) {
      const driver =
        drivers.find(
          (item) =>
            item.id ===
            donation.driver.id
        );

      if (driver) {
        releaseDriver(
          driver
        );
      }
    }

    donation.status =
      "CANCELLED";

    donation.cancelledAt =
      new Date().toISOString();

    donation.updatedAt =
      new Date().toISOString();

    res.json({
      message:
        "Donation cancelled successfully.",

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
    const donation =
      findDonation(
        req.params.donationId
      );

    if (!donation) {
      return res.status(404).json({
        message:
          "Donation not found.",
      });
    }

    if (
      donation.status ===
      "CANCELLED"
    ) {
      return res.status(400).json({
        message:
          "Cancelled donations cannot be matched.",
      });
    }

    const matchedNGO =
      findBestNGO(
        donation.location,
        donation.quantity,
        donation.expiryTime
      );

    if (!matchedNGO) {
      return res.status(404).json({
        message:
          "No suitable NGO found for this quantity.",
      });
    }

    const route =
      createRoute(
        donation.location,
        matchedNGO
      );

    donation.status =
      "MATCHED";

    donation.matchedNGO =
      matchedNGO;

    donation.matchScore =
      calculateMatchScore(
        donation,
        matchedNGO
      );

    donation.expiryRisk =
      getExpiryRisk(
        donation.expiryTime
      );

    donation.route =
      route;

    donation.updatedAt =
      new Date().toISOString();

    res.json({
      message:
        "Donation matched successfully!",

      donation,

      matchedNGO,

      matchScore:
        donation.matchScore,

      route,
    });
  }
);

/* =========================================================
   GET AVAILABLE DRIVERS
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
    const donation =
      findDonation(
        req.params.donationId
      );

    if (!donation) {
      return res.status(404).json({
        message:
          "Donation not found.",
      });
    }

    if (
      donation.status !==
      "MATCHED"
    ) {
      return res.status(400).json({
        message:
          "A driver can only be assigned to a matched donation.",
      });
    }

    if (
      !donation.matchedNGO
    ) {
      return res.status(400).json({
        message:
          "NGO has not been assigned yet.",
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
          "No driver available.",
      });
    }

    const route =
      donation.route.length >
      0
        ? donation.route
        : createRoute(
            donation.location,
            donation.matchedNGO
          );

    driver.status =
      "WAITING FOR PICKUP";

    /*
      Important:
      Driver starts from donor
      location, not driver's
      original location.
    */

    driver.currentArea =
      route[0];

    driver.headingTo =
      "Pickup Location";

    driver.route =
      [...route];

    driver.routeIndex = 0;

    driver.eta = 0;

    driver.distance = 0;

    donation.driver =
      getDriverSnapshot(
        driver
      );

    donation.status =
      "DRIVER ASSIGNED";

    donation.updatedAt =
      new Date().toISOString();

    res.json({
      message:
        "Driver assigned successfully!",

      donation,

      driver:
        donation.driver,
    });
  }
);

/* =========================================================
   DRIVER LOCATION
========================================================= */

app.put(
  "/api/driver-location/:donationId",
  (req, res) => {
    const donation =
      findDonation(
        req.params.donationId
      );

    if (
      !donation ||
      !donation.driver
    ) {
      return res.status(404).json({
        message:
          "Driver not found.",
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
          "Driver not found.",
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

      donation.driver =
        getDriverSnapshot(
          driver
        );

      return res.json({
        message:
          "Driver is waiting for pickup.",

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

      if (
        driver.routeIndex <
        route.length - 1
      ) {
        driver.headingTo =
          route[
            driver.routeIndex +
              1
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

      donation.driver =
        getDriverSnapshot(
          driver
        );

      donation.updatedAt =
        new Date().toISOString();

      return res.json({
        message:
          "Driver location updated.",

        donation,
      });
    }

    res.json({
      message:
        "No movement required.",

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
    const donation =
      findDonation(
        req.params.donationId
      );

    const newStatus =
      req.body.status;

    if (!donation) {
      return res.status(404).json({
        message:
          "Donation not found.",
      });
    }

    /* =====================================================
       PICKED UP
    ===================================================== */

    if (
      newStatus ===
      "PICKED UP"
    ) {
      if (
        donation.status !==
        "DRIVER ASSIGNED"
      ) {
        return res.status(400).json({
          message:
            "Food can only be picked up after a driver is assigned.",
        });
      }

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
            [...route];

          driver.routeIndex = 0;

          driver.currentArea =
            route[0];

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

          donation.driver =
            getDriverSnapshot(
              driver
            );
        }
      }
    }

    /* =====================================================
       DELIVERED
    ===================================================== */

    if (
      newStatus ===
      "DELIVERED"
    ) {
      if (
        donation.status !==
        "PICKED UP"
      ) {
        return res.status(400).json({
          message:
            "Food must be picked up before it can be delivered.",
        });
      }

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
            vehicleType:
              driver.vehicleType,
            vehicleNumber:
              driver.vehicleNumber,
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

    donation.updatedAt =
      new Date().toISOString();

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