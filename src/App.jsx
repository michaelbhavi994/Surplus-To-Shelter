import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [foodType, setFoodType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [expiryTime, setExpiryTime] = useState("");

  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);

  const [activeTab, setActiveTab] = useState("Dashboard");

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] =
    useState(false);

  const [settings, setSettings] = useState({
    donationAlerts: true,
    driverUpdates: true,
    deliveryUpdates: true,
    defaultCity: "Jaipur",
    safetyBuffer: "2 hours",
  });

  const [stats, setStats] = useState({
    meals: 248,
    kg: 124,
    co2: 101.7,
    deliveries: 18,
  });

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  const addNotification = (title, message) => {
    setNotifications((prev) => [
      {
        id: Date.now(),
        title,
        message,
        time: "Just now",
      },
      ...prev,
    ]);
  };

  /* =========================================================
     CREATE DONATION
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/donations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            foodType,
            quantity,
            location,
            expiryTime,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Donation failed"
        );
      }

      const matchResponse = await fetch(
        `http://127.0.0.1:5000/api/match/${data.donation.id}`,
        {
          method: "POST",
        }
      );

      const matchData =
        await matchResponse.json();

      if (!matchResponse.ok) {
        throw new Error(
          matchData.message ||
            "NGO matching failed"
        );
      }

      setDonation(matchData.donation);

      const donatedKg = Number(
        matchData.donation.quantity
      );

      setStats((prev) => ({
        ...prev,
        meals:
          prev.meals +
          Math.round(donatedKg * 2),
        kg:
          prev.kg + donatedKg,
        co2: Number(
          (
            prev.co2 +
            donatedKg * 0.82
          ).toFixed(1)
        ),
      }));

      if (settings.donationAlerts) {
        addNotification(
          "Donation Matched",
          `Your ${matchData.donation.foodType} donation has been matched with ${matchData.donation.matchedNGO.name}.`
        );
      }

      setFoodType("");
      setQuantity("");
      setLocation("");
      setExpiryTime("");

      setActiveTab("Donations");
    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          "Something went wrong"
      );
    }

    setLoading(false);
  };

  /* =========================================================
     ASSIGN DRIVER
  ========================================================= */

  const assignDriver = async () => {
    if (!donation) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/assign-driver/${donation.id}`,
        {
          method: "POST",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not assign driver"
        );
      }

      setDonation(data.donation);

      setDriverLocation({
        currentArea:
          data.donation.driver
            .currentArea,

        headingTo:
          data.donation.driver
            .headingTo,

        eta:
          data.donation.driver.eta,

        distance:
          data.donation.driver.distance,
      });

      if (settings.driverUpdates) {
        addNotification(
          "Driver Assigned",
          `${data.donation.driver.name} is waiting at the pickup location.`
        );
      }

      setActiveTab("Tracking");
    } catch (error) {
      alert(error.message);
    }
  };

  /* =========================================================
     LIVE DRIVER LOCATION

     IMPORTANT:
     Driver starts moving ONLY after
     food has been picked up.
  ========================================================= */

  useEffect(() => {
    if (
      !donation ||
      !donation.driver ||
      donation.status !== "PICKED UP"
    ) {
      return;
    }

    const interval = setInterval(
      async () => {
        try {
          const response =
            await fetch(
              `http://127.0.0.1:5000/api/driver-location/${donation.id}`,
              {
                method: "PUT",
              }
            );

          const data =
            await response.json();

          if (data.donation) {
            setDonation(
              data.donation
            );

            if (
              data.donation.driver
            ) {
              setDriverLocation({
                currentArea:
                  data.donation.driver
                    .currentArea,

                headingTo:
                  data.donation.driver
                    .headingTo,

                eta:
                  data.donation.driver
                    .eta,

                distance:
                  data.donation.driver
                    .distance,
              });
            }
          }
        } catch (error) {
          console.error(
            "Tracking error:",
            error
          );
        }
      },
      3000
    );

    return () =>
      clearInterval(interval);
  }, [
    donation?.id,
    donation?.status,
  ]);

  /* =========================================================
     UPDATE STATUS
  ========================================================= */

  const updateStatus = async (
    status
  ) => {
    if (!donation) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/donation-status/${donation.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Status update failed"
        );
      }

      setDonation(
        data.donation
      );

      if (data.donation.driver) {
        setDriverLocation({
          currentArea:
            data.donation.driver
              .currentArea,

          headingTo:
            data.donation.driver
              .headingTo,

          eta:
            data.donation.driver
              .eta,

          distance:
            data.donation.driver
              .distance,
        });
      }

      if (
        status === "PICKED UP"
      ) {
        if (
          settings.deliveryUpdates
        ) {
          addNotification(
            "Food Picked Up",
            "The driver has picked up the donated food and started the delivery route."
          );
        }

        setActiveTab("Tracking");
      }

      if (
        status === "DELIVERED"
      ) {
        setStats((prev) => ({
          ...prev,
          deliveries:
            prev.deliveries + 1,
        }));

        if (
          settings.deliveryUpdates
        ) {
          addNotification(
            "Food Delivered",
            "The donated food has successfully reached the NGO."
          );
        }
      }
    } catch (error) {
      alert(error.message);
    }
  };

  /* =========================================================
     STATUS
  ========================================================= */

  const statusOrder = [
    "POSTED",
    "MATCHED",
    "DRIVER ASSIGNED",
    "PICKED UP",
    "DELIVERED",
  ];

  const isStatusActive = (
    status
  ) => {
    if (!donation) return false;

    return (
      statusOrder.indexOf(
        donation.status
      ) >=
      statusOrder.indexOf(status)
    );
  };

  /* =========================================================
     DRIVER ICON
  ========================================================= */

  const getDriverIcon = () => {
    if (
      donation?.driver?.gender ===
      "female"
    ) {
      return "👩";
    }

    return "👨";
  };

  /* =========================================================
     DRIVER PROGRESS
  ========================================================= */

  const getDriverProgress = () => {
    if (!donation) return 0;

    if (
      donation.status ===
      "DRIVER ASSIGNED"
    ) {
      return 0;
    }

    if (
      donation.status ===
      "DELIVERED"
    ) {
      return 100;
    }

    const distance =
      Number(
        driverLocation?.distance ??
          donation?.driver?.distance ??
          4.2
      );

    const progress =
      100 -
      (distance / 4.2) * 100;

    return Math.min(
      100,
      Math.max(8, progress)
    );
  };

  return (
    <div className="app">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">
            🤝
          </div>

          <div>
            <h2>
              Surplus-to-Shelter
            </h2>

            <span>
              Food Donation Network
            </span>
          </div>

        </div>

        <nav>

          <button
            className={
              activeTab ===
              "Dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActiveTab(
                "Dashboard"
              )
            }
          >
            🏠
            <span>
              Dashboard
            </span>
          </button>

          <button
            className={
              activeTab ===
              "Donations"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActiveTab(
                "Donations"
              )
            }
          >
            📦
            <span>
              Food Donations
            </span>
          </button>

          <button
            className={
              activeTab ===
              "Tracking"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActiveTab(
                "Tracking"
              )
            }
          >
            🚗
            <span>
              Driver Tracking
            </span>
          </button>

          <button
            className={
              activeTab ===
              "Impact"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActiveTab(
                "Impact"
              )
            }
          >
            🌱
            <span>
              Community Impact
            </span>
          </button>

        </nav>

        <div className="sidebar-bottom">

          <button
            className="settings-btn"
            onClick={() =>
              setActiveTab(
                "Settings"
              )
            }
          >
            ⚙️
            <span>
              Settings
            </span>
          </button>

          <div className="team-card">

            <div className="team-avatar">
              B
            </div>

            <div>
              <strong>
                BrainByte
              </strong>

              <small>
                AmiHacks 1.0
              </small>
            </div>

          </div>

        </div>

      </aside>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="main">

        {/* ===================================================
            TOP BAR
        =================================================== */}

        <header className="topbar">

          <div>

            <h1>
              {activeTab}
            </h1>

            <p>
              Connecting surplus food
              with people and communities
              who need it.
            </p>

          </div>

          <div className="top-actions">

            {/* NOTIFICATIONS */}

            <div className="notification-wrapper">

              <button
                className="notification"
                onClick={() =>
                  setShowNotifications(
                    !showNotifications
                  )
                }
              >
                🔔

                {notifications.length >
                  0 && (
                  <span className="notification-count">
                    {notifications.length}
                  </span>
                )}

              </button>

              {showNotifications && (

                <div className="notification-dropdown">

                  <div className="notification-header">

                    <strong>
                      Notifications
                    </strong>

                    <button
                      onClick={() =>
                        setNotifications([])
                      }
                    >
                      Clear
                    </button>

                  </div>

                  {notifications.length ===
                  0 ? (

                    <div className="no-notifications">

                      🔔

                      <p>
                        NO NOTIFICATIONS
                      </p>

                    </div>

                  ) : (

                    notifications.map(
                      (item) => (
                        <div
                          className="notification-item"
                          key={item.id}
                        >

                          <strong>
                            {item.title}
                          </strong>

                          <p>
                            {item.message}
                          </p>

                          <small>
                            {item.time}
                          </small>

                        </div>
                      )
                    )

                  )}

                </div>
              )}

            </div>

            <div className="online">

              <span />

              Network Active

            </div>

          </div>

        </header>

        {/* ===================================================
            DASHBOARD
        =================================================== */}

        {activeTab ===
          "Dashboard" && (

          <>

            <section className="hero">

              <div className="hero-content">

                <span className="hero-tag">
                  COMMUNITY FOOD DONATION
                </span>

                <h2>
                  Give surplus food
                  <br />
                  a meaningful destination.
                </h2>

                <p>
                  Connect surplus food
                  from restaurants, caterers,
                  campuses and stores with
                  NGOs and community
                  organisations.
                </p>

                <button
                  className="hero-btn"
                  onClick={() =>
                    setActiveTab(
                      "Donations"
                    )
                  }
                >
                  + Donate Food
                </button>

              </div>

              <div className="hero-visual">

                <div className="hero-circle">
                  🤝
                </div>

                <div className="hero-small">
                  🍱
                </div>

                <div className="hero-small two">
                  🏠
                </div>

              </div>

            </section>

            {/* STATS */}

            <section className="stats-grid">

              <div className="stat-card green">

                <div className="stat-icon">
                  🍽️
                </div>

                <div>

                  <span>
                    Meals Served
                  </span>

                  <strong>
                    {stats.meals}
                  </strong>

                  <small>
                    From donated food
                  </small>

                </div>

              </div>

              <div className="stat-card orange">

                <div className="stat-icon">
                  📦
                </div>

                <div>

                  <span>
                    Food Delivered
                  </span>

                  <strong>
                    {stats.kg.toFixed(1)} kg
                  </strong>

                  <small>
                    To community partners
                  </small>

                </div>

              </div>

              <div className="stat-card blue">

                <div className="stat-icon">
                  ♻️
                </div>

                <div>

                  <span>
                    Waste Prevented
                  </span>

                  <strong>
                    {stats.kg.toFixed(1)} kg
                  </strong>

                  <small>
                    Kept away from waste
                  </small>

                </div>

              </div>

              <div className="stat-card purple">

                <div className="stat-icon">
                  🌱
                </div>

                <div>

                  <span>
                    CO₂e Avoided
                  </span>

                  <strong>
                    {stats.co2.toFixed(1)} kg
                  </strong>

                  <small>
                    Environmental impact
                  </small>

                </div>

              </div>

            </section>

            {/* HOW IT WORKS */}

            <section className="section">

              <div className="section-heading">

                <div>

                  <h2>
                    How it works
                  </h2>

                  <p>
                    From surplus food to
                    community support.
                  </p>

                </div>

              </div>

              <div className="steps-grid">

                <div className="step-card">

                  <div className="step-number">
                    01
                  </div>

                  <div className="step-icon">
                    📦
                  </div>

                  <h3>
                    Food Donated
                  </h3>

                  <p>
                    Donor posts available
                    surplus food and its
                    safe consumption time.
                  </p>

                </div>

                <div className="step-card">

                  <div className="step-number">
                    02
                  </div>

                  <div className="step-icon">
                    🏠
                  </div>

                  <h3>
                    NGO Matched
                  </h3>

                  <p>
                    The platform identifies
                    a suitable community
                    recipient.
                  </p>

                </div>

                <div className="step-card">

                  <div className="step-number">
                    03
                  </div>

                  <div className="step-icon">
                    🚗
                  </div>

                  <h3>
                    Pickup
                  </h3>

                  <p>
                    A delivery partner
                    collects the food from
                    the donor.
                  </p>

                </div>

                <div className="step-card">

                  <div className="step-number">
                    04
                  </div>

                  <div className="step-icon">
                    ❤️
                  </div>

                  <h3>
                    Food Delivered
                  </h3>

                  <p>
                    Food reaches the NGO
                    instead of becoming waste.
                  </p>

                </div>

              </div>

            </section>

            {/* COMMUNITY NETWORK */}

            <section className="section">

              <div className="section-heading">

                <div>

                  <h2>
                    Community Network
                  </h2>

                  <p>
                    Organisations and people
                    working together.
                  </p>

                </div>

              </div>

              <div className="network-section">

                <div className="network-card">

                  <span>
                    🏢
                  </span>

                  <div>

                    <strong>
                      Food Donors
                    </strong>

                    <p>
                      Restaurants,
                      caterers & campuses
                    </p>

                    <small>
                      Green Leaf Caterers •
                      City Bites • Amity Campus
                    </small>

                  </div>

                </div>

                <div className="network-card">

                  <span>
                    🏠
                  </span>

                  <div>

                    <strong>
                      NGO Partners
                    </strong>

                    <p>
                      Shelters &
                      community organisations
                    </p>

                    <small>
                      Annapurna Shelter •
                      Feeding Hands Jaipur •
                      Seva Kitchen Jaipur
                    </small>

                  </div>

                </div>

                <div className="network-card">

                  <span>
                    🚗
                  </span>

                  <div>

                    <strong>
                      Delivery Partners
                    </strong>

                    <p>
                      Pickup & delivery
                      support
                    </p>

                    <small>
                      Rahul • Aman • Priya •
                      Neha • Vikas
                    </small>

                  </div>

                </div>

              </div>

            </section>

          </>

        )}

        {/* ===================================================
            FOOD DONATIONS
        =================================================== */}

        {activeTab ===
          "Donations" && (

          <section className="content-card">

            <div className="page-title">

              <div>

                <h2 className="donate-heading">
                  📦 Donate Surplus Food
                </h2>

                <p>
                  Provide food details so
                  we can find a suitable
                  community recipient.
                </p>

              </div>

              <div className="safe-badge">
                🛡️ Food Safety
              </div>

            </div>

            <form
              className="donation-form"
              onSubmit={handleSubmit}
            >

              <div className="form-row">

                <div className="field">

                  <label>
                    Food Type
                  </label>

                  <input
                    type="text"
                    value={foodType}
                    onChange={(e) =>
                      setFoodType(
                        e.target.value
                      )
                    }
                    placeholder="e.g. Cooked Meals, Rice, Dal"
                    required
                  />

                </div>

                <div className="field">

                  <label>
                    Quantity
                  </label>

                  <div className="input-unit">

                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(
                          e.target.value
                        )
                      }
                      placeholder="20"
                      required
                    />

                    <span>
                      kg
                    </span>

                  </div>

                </div>

              </div>

              <div className="form-row">

                <div className="field">

                  <label>
                    Pickup Location
                  </label>

                  <input
                    type="text"
                    value={location}
                    onChange={(e) =>
                      setLocation(
                        e.target.value
                      )
                    }
                    placeholder="C-Scheme, Jaipur"
                    required
                  />

                </div>

                <div className="field">

                  <label>
                    Safe Until
                  </label>

                  <input
                    type="time"
                    value={expiryTime}
                    onChange={(e) =>
                      setExpiryTime(
                        e.target.value
                      )
                    }
                    required
                  />

                </div>

              </div>

              <button
                className="primary-btn"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "MATCHING WITH NGO..."
                  : "POST FOOD & FIND NGO"}
              </button>

            </form>

            {/* DONATION RESULT */}

            {donation && (

              <div className="result-section">

                <div className="success-header">

                  <div className="success-icon">
                    ✓
                  </div>

                  <div>

                    <h3>
                      Food Donation Matched
                    </h3>

                    <p>
                      A suitable community
                      recipient has been found.
                    </p>

                  </div>

                </div>

                <div className="result-grid">

                  <div className="info-box">

                    <span>
                      DONATED FOOD
                    </span>

                    <h3>
                      🍱{" "}
                      {donation.foodType}
                    </h3>

                    <p>
                      {donation.quantity} kg
                      <br />
                      📍 {donation.location}
                    </p>

                  </div>

                  {donation.matchedNGO && (

                    <div className="info-box">

                      <span>
                        COMMUNITY RECIPIENT
                      </span>

                      <h3>
                        🏠{" "}
                        {
                          donation
                            .matchedNGO
                            .name
                        }
                      </h3>

                      <p>
                        📍{" "}
                        {
                          donation
                            .matchedNGO
                            .location
                        }
                        <br />
                        Capacity:{" "}
                        {
                          donation
                            .matchedNGO
                            .capacity
                        } kg
                      </p>

                    </div>

                  )}

                </div>

                {/* STATUS TIMELINE */}

                <div className="timeline">

                  {statusOrder.map(
                    (status, index) => (

                      <div
                        className={
                          isStatusActive(
                            status
                          )
                            ? "timeline-item active"
                            : "timeline-item"
                        }
                        key={status}
                      >

                        <div className="timeline-dot">

                          {isStatusActive(
                            status
                          )
                            ? "✓"
                            : index + 1}

                        </div>

                        <span>

                          {status ===
                          "DRIVER ASSIGNED"
                            ? "DRIVER"
                            : status}

                        </span>

                      </div>

                    )
                  )}

                </div>

                {/* ASSIGN DRIVER */}

                {donation.status ===
                  "MATCHED" && (

                  <button
                    className="primary-btn"
                    onClick={
                      assignDriver
                    }
                  >
                    🚗 ASSIGN DRIVER
                  </button>

                )}

                {/* PICKUP */}

                {donation.status ===
                  "DRIVER ASSIGNED" && (

                  <button
                    className="primary-btn"
                    onClick={() =>
                      updateStatus(
                        "PICKED UP"
                      )
                    }
                  >
                    📦 CONFIRM FOOD PICKUP
                  </button>

                )}

                {/* DELIVER */}

                {donation.status ===
                  "PICKED UP" && (

                  <button
                    className="primary-btn"
                    onClick={() =>
                      updateStatus(
                        "DELIVERED"
                      )
                    }
                  >
                    🏠 CONFIRM FOOD DELIVERED
                  </button>

                )}

                {/* DELIVERED */}

                {donation.status ===
                  "DELIVERED" && (

                  <div className="delivered-box">

                    🎉 Food Delivered Successfully

                    <br />

                    ♻️ This food was kept
                    from becoming waste.

                  </div>

                )}

              </div>

            )}

          </section>

        )}

        {/* ===================================================
            DRIVER TRACKING
        =================================================== */}

        {activeTab ===
          "Tracking" && (

          <section className="content-card">

            <div className="page-title">

              <div>

                <h2>
                  🚗 Driver Tracking
                </h2>

                <p>
                  Track the food delivery
                  from donor to NGO.
                </p>

              </div>

              <div className="live-badge">

                <span />

                LIVE

              </div>

            </div>

            {donation &&
            donation.driver ? (

              <div className="tracking-layout">

                {/* ROUTE CARD */}

                <div className="route-card">

                  <div className="route-header">

                    <span>
                      DRIVER LOCATION
                    </span>

                    <strong>
                      📍 Near:{" "}
                      {driverLocation?.currentArea ??
                        donation.driver
                          .currentArea}
                    </strong>

                    <div className="heading-text">

                      🏁 Heading to:{" "}

                      {driverLocation?.headingTo ??
                        donation.driver
                          .headingTo}

                    </div>

                  </div>

                  {/* ROUTE */}

                  <div className="route-line">

                    <div className="route-point">

                      <div className="point active-point">
                        🚗
                      </div>

                      <span>
                        Driver
                      </span>

                    </div>

                    <div className="route-progress">

                      <div
                        style={{
                          width: `${getDriverProgress()}%`,
                        }}
                      />

                    </div>

                    <div className="route-point">

                      <div className="point">
                        🏠
                      </div>

                      <span>
                        NGO
                      </span>

                    </div>

                  </div>

                  <div className="route-progress-label">

                    {donation.status ===
                    "DRIVER ASSIGNED"
                      ? "Driver is waiting at pickup location"
                      : donation.status ===
                          "DELIVERED" ||
                        (driverLocation?.distance ??
                          donation?.driver?.distance ??
                          0) <= 0
                      ? "Driver has reached the NGO"
                      : "Driver is moving towards the NGO"}

                  </div>

                  {/* ROUTE STATS */}

                  <div className="route-stats">

                    <div>

                      <span>
                        DISTANCE
                      </span>

                      <strong>
                        {(
                          driverLocation?.distance ??
                          donation.driver
                            .distance ??
                          0
                        ).toFixed(1)}{" "}
                        km
                      </strong>

                    </div>

                    <div>

                      <span>
                        ETA
                      </span>

                      <strong>
                        {driverLocation?.eta ??
                          donation.driver
                            .eta ??
                          0}{" "}
                        min
                      </strong>

                    </div>

                    <div>

                      <span>
                        STATUS
                      </span>

                      <strong>
                        {donation.status}
                      </strong>

                    </div>

                  </div>

                  {/* ACTION */}

                  <div className="tracking-action">

                    {donation.status ===
                      "DRIVER ASSIGNED" && (

                      <button
                        className="primary-btn"
                        onClick={() =>
                          updateStatus(
                            "PICKED UP"
                          )
                        }
                      >
                        📦 CONFIRM FOOD PICKUP
                      </button>

                    )}

                    {donation.status ===
                      "PICKED UP" && (

                      <button
                        className="primary-btn"
                        onClick={() =>
                          updateStatus(
                            "DELIVERED"
                          )
                        }
                      >
                        🏠 CONFIRM FOOD DELIVERED
                      </button>

                    )}

                    {donation.status ===
                      "DELIVERED" && (

                      <div className="delivered-box">

                        🎉 Food Delivered Successfully

                        <br />

                        ♻️ Food reached the
                        community instead
                        of becoming waste.

                      </div>

                    )}

                  </div>

                </div>

                {/* DRIVER PROFILE */}

                <div className="driver-profile">

                  <div className="driver-avatar">
                    {getDriverIcon()}
                  </div>

                  <h3>
                    {donation.driver.name}
                  </h3>

                  <p>
                    Delivery Driver
                  </p>

                  <div className="driver-status">

                    🟢{" "}
                    {donation.driver.status}

                  </div>

                  <hr />

                  <p>
                    📞{" "}
                    {donation.driver.phone}
                  </p>

                  <p>
                    📍 Near:{" "}
                    {driverLocation?.currentArea ??
                      donation.driver
                        .currentArea}
                  </p>

                  <p>
                    🏁 Heading to:{" "}
                    {driverLocation?.headingTo ??
                      donation.driver
                        .headingTo}
                  </p>

                  {donation.matchedNGO && (

                    <p>
                      🏠 NGO:{" "}
                      {
                        donation
                          .matchedNGO
                          .name
                      }
                    </p>

                  )}

                </div>

              </div>

            ) : (

              <div className="empty-state">

                <div>
                  🚗
                </div>

                <h3>
                  No Active Delivery
                </h3>

                <p>
                  Assign a driver to
                  start tracking.
                </p>

                <button
                  className="primary-btn small-btn"
                  onClick={() =>
                    setActiveTab(
                      "Donations"
                    )
                  }
                >
                  View Food Donation
                </button>

              </div>

            )}

          </section>

        )}

        {/* ===================================================
            COMMUNITY IMPACT
        =================================================== */}

        {activeTab ===
          "Impact" && (

          <section className="content-card">

            <div className="page-title">

              <div>

                <h2>
                  🌱 Community Impact
                </h2>

                <p>
                  See how much food has
                  been delivered to
                  communities.
                </p>

              </div>

            </div>

            <div className="impact-big-grid">

              <div className="impact-big green-impact">

                <span>
                  🍽️
                </span>

                <strong>
                  {stats.meals}
                </strong>

                <p>
                  Meals Served
                </p>

              </div>

              <div className="impact-big orange-impact">

                <span>
                  📦
                </span>

                <strong>
                  {stats.kg.toFixed(1)}
                </strong>

                <p>
                  kg Food Delivered
                </p>

              </div>

              <div className="impact-big blue-impact">

                <span>
                  ♻️
                </span>

                <strong>
                  {stats.kg.toFixed(1)}
                </strong>

                <p>
                  kg Waste Prevented
                </p>

              </div>

              <div className="impact-big purple-impact">

                <span>
                  🌱
                </span>

                <strong>
                  {stats.co2.toFixed(1)}
                </strong>

                <p>
                  kg CO₂e Avoided
                </p>

              </div>

            </div>

            <div className="impact-message">

              <div>
                🤝
              </div>

              <div>

                <h3>
                  Every donation can
                  make a difference.
                </h3>

                <p>
                  Surplus edible food is
                  matched with community
                  organisations and delivered
                  before it becomes waste.
                </p>

              </div>

            </div>

          </section>

        )}

        {/* ===================================================
            SETTINGS
        =================================================== */}

        {activeTab ===
          "Settings" && (

          <section className="content-card">

            <div className="page-title">

              <div>

                <h2>
                  ⚙️ Settings
                </h2>

                <p>
                  Manage your platform
                  preferences.
                </p>

              </div>

            </div>

            <div className="settings-page">

              <div className="settings-section">

                <h3>
                  Profile
                </h3>

                <div className="settings-fields">

                  <div className="field">

                    <label>
                      Organisation Name
                    </label>

                    <input
                      value="BrainByte"
                      readOnly
                    />

                  </div>

                  <div className="field">

                    <label>
                      City
                    </label>

                    <input
                      value={
                        settings.defaultCity
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          defaultCity:
                            e.target.value,
                        })
                      }
                    />

                  </div>

                </div>

              </div>

              <div className="settings-section">

                <h3>
                  Notifications
                </h3>

                <label className="toggle-row">

                  <span>
                    Donation Alerts
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      settings.donationAlerts
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        donationAlerts:
                          e.target.checked,
                      })
                    }
                  />

                </label>

                <label className="toggle-row">

                  <span>
                    Driver Updates
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      settings.driverUpdates
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        driverUpdates:
                          e.target.checked,
                      })
                    }
                  />

                </label>

                <label className="toggle-row">

                  <span>
                    Delivery Updates
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      settings.deliveryUpdates
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        deliveryUpdates:
                          e.target.checked,
                      })
                    }
                  />

                </label>

              </div>

              <div className="settings-section">

                <h3>
                  Food Safety
                </h3>

                <div className="field">

                  <label>
                    Default Safety Buffer
                  </label>

                  <select
                    value={
                      settings.safetyBuffer
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        safetyBuffer:
                          e.target.value,
                      })
                    }
                  >

                    <option>
                      1 hour
                    </option>

                    <option>
                      2 hours
                    </option>

                    <option>
                      3 hours
                    </option>

                    <option>
                      4 hours
                    </option>

                  </select>

                </div>

              </div>

              <div className="about-box">

                <h3>
                  About Surplus-to-Shelter
                </h3>

                <p>
                  A community-focused platform
                  that helps connect surplus
                  edible food with NGOs and
                  shelters before it becomes
                  waste.
                </p>

                <small>
                  AmiHacks 1.0 • BrainByte
                </small>

              </div>

            </div>

          </section>

        )}

      </main>

    </div>
  );
}

export default App;