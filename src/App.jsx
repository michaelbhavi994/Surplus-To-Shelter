import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:5000/api";

function App() {
  const [foodType, setFoodType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [expiryTime, setExpiryTime] = useState("");

  const [donation, setDonation] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(false);

  const [driverLocation, setDriverLocation] = useState(null);

  const [activeTab, setActiveTab] = useState("Dashboard");

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] =
    useState(false);

  const [historyFilter, setHistoryFilter] =
    useState("ALL");

  const [editingDonation, setEditingDonation] =
    useState(null);

  const [editFoodType, setEditFoodType] =
    useState("");
  const [editQuantity, setEditQuantity] =
    useState("");
  const [editLocation, setEditLocation] =
    useState("");
  const [editExpiryTime, setEditExpiryTime] =
    useState("");

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
     FETCH DONATIONS
  ========================================================= */

  const fetchDonations = async () => {
    try {
      const response = await fetch(
        `${API}/donations`
      );

      const data = await response.json();

      if (response.ok) {
        setDonations(data);

        /*
          Keep the currently selected donation
          synchronized with backend.
        */
        if (donation) {
          const updated = data.find(
            (item) => item.id === donation.id
          );

          if (updated) {
            setDonation(updated);

            if (updated.driver) {
              setDriverLocation({
                currentArea:
                  updated.driver.currentArea,
                headingTo:
                  updated.driver.headingTo,
                eta: updated.driver.eta,
                distance:
                  updated.driver.distance,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(
        "Could not load donations:",
        error
      );
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  /* =========================================================
     CREATE DONATION
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const response = await fetch(
        `${API}/donations`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
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
          data.message ||
            "Donation failed"
        );
      }

      const matchResponse = await fetch(
        `${API}/match/${data.donation.id}`,
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

      setDonations((prev) => [
        matchData.donation,
        ...prev.filter(
          (item) =>
            item.id !==
            matchData.donation.id
        ),
      ]);

      const donatedKg = Number(
        matchData.donation.quantity
      );

      setStats((prev) => ({
        ...prev,
        meals:
          prev.meals +
          Math.round(
            donatedKg * 2
          ),
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
     EDIT DONATION
  ========================================================= */

  const openEditDonation = (item) => {
    if (
      item.status !== "POSTED" &&
      item.status !== "MATCHED"
    ) {
      alert(
        "This donation can no longer be edited."
      );
      return;
    }

    setEditingDonation(item);

    setEditFoodType(
      item.foodType || ""
    );

    setEditQuantity(
      item.quantity || ""
    );

    setEditLocation(
      item.location || ""
    );

    setEditExpiryTime(
      item.expiryTime || ""
    );
  };

  const closeEditDonation = () => {
    setEditingDonation(null);
    setEditFoodType("");
    setEditQuantity("");
    setEditLocation("");
    setEditExpiryTime("");
  };

  const saveEditedDonation = async () => {
    if (!editingDonation) return;

    try {
      const response = await fetch(
        `${API}/donations/${editingDonation.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            foodType: editFoodType,
            quantity: editQuantity,
            location: editLocation,
            expiryTime: editExpiryTime,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not update donation"
        );
      }

      setDonation(data.donation);

      setDonations((prev) =>
        prev.map((item) =>
          item.id ===
          data.donation.id
            ? data.donation
            : item
        )
      );

      addNotification(
        "Donation Updated",
        "Your donation details have been updated successfully."
      );

      closeEditDonation();
    } catch (error) {
      alert(error.message);
    }
  };

  /* =========================================================
     CANCEL DONATION
  ========================================================= */

  const cancelDonation = async (item = donation) => {
    if (!item) return;

    if (
      item.status === "PICKED UP" ||
      item.status === "DELIVERED" ||
      item.status === "CANCELLED"
    ) {
      alert(
        "This donation cannot be cancelled at this stage."
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this donation?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API}/donations/${item.id}/cancel`,
        {
          method: "PUT",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not cancel donation"
        );
      }

      setDonation(data.donation);

      setDonations((prev) =>
        prev.map((item) =>
          item.id ===
          data.donation.id
            ? data.donation
            : item
        )
      );

      setDriverLocation(null);

      addNotification(
        "Donation Cancelled",
        "The donation has been cancelled successfully."
      );

      setActiveTab("History");
    } catch (error) {
      alert(error.message);
    }
  };

  /* =========================================================
     ASSIGN DRIVER
  ========================================================= */

  const assignDriver = async () => {
    if (!donation) return;

    try {
      const response = await fetch(
        `${API}/assign-driver/${donation.id}`,
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

      setDonations((prev) =>
        prev.map((item) =>
          item.id ===
          data.donation.id
            ? data.donation
            : item
        )
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
            data.donation.driver.eta,

          distance:
            data.donation.driver.distance,
        });
      }

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
  ========================================================= */

  useEffect(() => {
    if (
      !donation ||
      !donation.driver ||
      donation.status !==
        "PICKED UP"
    ) {
      return;
    }

    const interval =
      setInterval(async () => {
        try {
          const response =
            await fetch(
              `${API}/driver-location/${donation.id}`,
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

            setDonations((prev) =>
              prev.map((item) =>
                item.id ===
                data.donation.id
                  ? data.donation
                  : item
              )
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
      }, 3000);

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
        `${API}/donation-status/${donation.id}`,
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

      setDonations((prev) =>
        prev.map((item) =>
          item.id ===
          data.donation.id
            ? data.donation
            : item
        )
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

        setActiveTab(
          "Tracking"
        );
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

    if (
      donation.status ===
      "CANCELLED"
    ) {
      return false;
    }

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
      (distance / 4.2) *
        100;

    return Math.min(
      100,
      Math.max(8, progress)
    );
  };

  /* =========================================================
     SIMULATED LIVE ROUTE MAP
  ========================================================= */

  const getRouteNodes = () => {
    const route = donation?.driver?.route || donation?.route || [];
    if (Array.isArray(route) && route.length > 0) return route;
    return [
      donation?.location || "Pickup Location",
      driverLocation?.currentArea || donation?.driver?.currentArea || "En route",
      donation?.matchedNGO?.name || "NGO Destination",
    ];
  };

  const getRouteIndex = () => {
    const index = Number(donation?.driver?.routeIndex ?? donation?.driver?.currentRouteIndex ?? 0);
    return Number.isFinite(index) ? Math.max(0, index) : 0;
  };

  const getMapProgress = () => {
    if (!donation?.driver) return 0;
    if (donation.status === "DELIVERED") return 100;
    const nodes = getRouteNodes();
    if (nodes.length <= 1) return getDriverProgress();
    return Math.min(100, Math.max(0, (Math.min(getRouteIndex(), nodes.length - 1) / (nodes.length - 1)) * 100));
  };

  /* =========================================================
     STATUS BADGE
  ========================================================= */

  const getStatusClass = (
    status
  ) => {
    switch (status) {
      case "DELIVERED":
        return "status-delivered";

      case "CANCELLED":
        return "status-cancelled";

      case "PICKED UP":
        return "status-picked";

      case "DRIVER ASSIGNED":
        return "status-assigned";

      case "MATCHED":
        return "status-matched";

      default:
        return "status-posted";
    }
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatDate = (date) => {
    if (!date) return "—";

    try {
      return new Date(
        date
      ).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  /* =========================================================
     HISTORY FILTER
  ========================================================= */

  const filteredDonations =
    donations.filter((item) => {
      if (
        historyFilter === "ALL"
      ) {
        return true;
      }

      if (
        historyFilter === "ACTIVE"
      ) {
        return (
          item.status !==
            "DELIVERED" &&
          item.status !==
            "CANCELLED"
        );
      }

      return (
        item.status ===
        historyFilter
      );
    });

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
              "History"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => {
              fetchDonations();
              setActiveTab(
                "History"
              );
            }}
          >
            📋
            <span>
              Donation History
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
              {activeTab ===
              "History"
                ? "Donation History"
                : activeTab}
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
                      {donation.status ===
                      "CANCELLED"
                        ? "Donation Cancelled"
                        : donation.status ===
                          "DELIVERED"
                        ? "Food Donation Completed"
                        : "Food Donation Matched"}
                    </h3>

                    <p>
                      {donation.status ===
                      "CANCELLED"
                        ? "This donation is no longer active."
                        : donation.status ===
                          "DELIVERED"
                        ? "The donation has successfully reached the community."
                        : "A suitable community recipient has been found."}
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
                      <br />
                      🕒 Safe until{" "}
                      {donation.expiryTime}
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

                {donation.status !==
                  "CANCELLED" ? (

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

                ) : (

                  <div
                    style={{
                      marginTop:
                        "20px",
                      padding:
                        "16px",
                      borderRadius:
                        "12px",
                      background:
                        "#fff1f1",
                      color:
                        "#a33",
                      fontWeight:
                        "600",
                    }}
                  >
                    ❌ CANCELLED
                  </div>

                )}

                {/* DONATION ACTIONS */}

                {(donation.status ===
                  "POSTED" ||
                  donation.status ===
                    "MATCHED") && (

                  <div
                    style={{
                      display:
                        "flex",
                      gap: "12px",
                      flexWrap:
                        "wrap",
                      marginTop:
                        "18px",
                    }}
                  >

                    <button
                      className="primary-btn"
                      onClick={() =>
                        openEditDonation(
                          donation
                        )
                      }
                      style={{
                        flex:
                          "1 1 180px",
                      }}
                    >
                      ✏️ EDIT DONATION
                    </button>

                    <button
                      onClick={() =>
                        cancelDonation(
                          donation
                        )
                      }
                      style={{
                        flex:
                          "1 1 180px",
                        padding:
                          "13px 18px",
                        border:
                          "1px solid #dc6b6b",
                        background:
                          "#fff",
                        color:
                          "#b23a3a",
                        borderRadius:
                          "10px",
                        fontWeight:
                          "700",
                        cursor:
                          "pointer",
                      }}
                    >
                      ❌ CANCEL DONATION
                    </button>

                  </div>

                )}

                {/* ASSIGN DRIVER */}

                {donation.status ===
                  "MATCHED" && (

                  <button
                    className="primary-btn"
                    onClick={
                      assignDriver
                    }
                    style={{
                      marginTop:
                        "12px",
                    }}
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
            DONATION HISTORY
        =================================================== */}

        {activeTab ===
          "History" && (

          <section className="content-card">

            <div className="page-title">

              <div>

                <h2>
                  📋 Donation History
                </h2>

                <p>
                  Review previous and
                  active food rescue
                  activities.
                </p>

              </div>

              <button
                className="primary-btn"
                onClick={
                  fetchDonations
                }
                style={{
                  width:
                    "auto",
                  padding:
                    "10px 18px",
                }}
              >
                ↻ Refresh
              </button>

            </div>

            {/* FILTERS */}

            <div
              style={{
                display:
                  "flex",
                gap: "8px",
                flexWrap:
                  "wrap",
                margin:
                  "20px 0",
              }}
            >

              {[
                "ALL",
                "ACTIVE",
                "DELIVERED",
                "CANCELLED",
              ].map(
                (filter) => (

                  <button
                    key={filter}
                    onClick={() =>
                      setHistoryFilter(
                        filter
                      )
                    }
                    style={{
                      padding:
                        "9px 15px",
                      borderRadius:
                        "8px",
                      border:
                        "1px solid #d9ded9",
                      background:
                        historyFilter ===
                        filter
                          ? "#244d3b"
                          : "#fff",
                      color:
                        historyFilter ===
                        filter
                          ? "#fff"
                          : "#334",
                      fontWeight:
                        "700",
                      cursor:
                        "pointer",
                    }}
                  >
                    {filter}
                  </button>

                )
              )}

            </div>

            {filteredDonations.length ===
            0 ? (

              <div className="empty-state">

                <div>
                  📋
                </div>

                <h3>
                  No donations found
                </h3>

                <p>
                  Your donation history
                  will appear here.
                </p>

                <button
                  className="primary-btn small-btn"
                  onClick={() =>
                    setActiveTab(
                      "Donations"
                    )
                  }
                >
                  Create Donation
                </button>

              </div>

            ) : (

              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap:
                    "12px",
                }}
              >

                {filteredDonations.map(
                  (item) => (

                    <div
                      key={item.id}
                      style={{
                        border:
                          "1px solid #e3e7e3",
                        borderRadius:
                          "14px",
                        padding:
                          "18px",
                        background:
                          "#fff",
                      }}
                    >

                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "flex-start",
                          gap:
                            "15px",
                          flexWrap:
                            "wrap",
                        }}
                      >

                        <div>

                          <h3
                            style={{
                              margin:
                                "0 0 6px",
                              color:
                                "#20362c",
                            }}
                          >
                            🍱{" "}
                            {item.foodType}
                          </h3>

                          <p
                            style={{
                              margin:
                                "0",
                              color:
                                "#68736d",
                            }}
                          >
                            {item.quantity} kg
                            {" • "}
                            📍{" "}
                            {item.location}
                          </p>

                        </div>

                        <span
                          className={
                            getStatusClass(
                              item.status
                            )
                          }
                          style={{
                            padding:
                              "7px 11px",
                            borderRadius:
                              "20px",
                            fontSize:
                              "12px",
                            fontWeight:
                              "800",
                          }}
                        >
                          {item.status}
                        </span>

                      </div>

                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit,minmax(170px,1fr))",
                          gap:
                            "12px",
                          marginTop:
                            "16px",
                          paddingTop:
                            "15px",
                          borderTop:
                            "1px solid #edf0ed",
                        }}
                      >

                        <div>
                          <small>
                            RECIPIENT
                          </small>

                          <strong
                            style={{
                              display:
                                "block",
                              marginTop:
                                "4px",
                            }}
                          >
                            {item
                              .matchedNGO
                              ?.name ||
                              "Not matched"}
                          </strong>
                        </div>

                        <div>
                          <small>
                            DRIVER
                          </small>

                          <strong
                            style={{
                              display:
                                "block",
                              marginTop:
                                "4px",
                            }}
                          >
                            {item.driver
                              ?.name ||
                              "Not assigned"}
                          </strong>
                        </div>

                        <div>
                          <small>
                            VEHICLE
                          </small>

                          <strong
                            style={{
                              display:
                                "block",
                              marginTop:
                                "4px",
                            }}
                          >
                            {item.driver
                              ?.vehicleType
                              ? `${item.driver.vehicleType} • ${item.driver.vehicleNumber}`
                              : "—"}
                          </strong>
                        </div>

                        <div>
                          <small>
                            CREATED
                          </small>

                          <strong
                            style={{
                              display:
                                "block",
                              marginTop:
                                "4px",
                            }}
                          >
                            {formatDate(
                              item.createdAt
                            )}
                          </strong>
                        </div>

                      </div>

                      {/* HISTORY ACTIONS */}

                      <div
                        style={{
                          display:
                            "flex",
                          gap:
                            "9px",
                          flexWrap:
                            "wrap",
                          marginTop:
                            "15px",
                        }}
                      >

                        <button
                          onClick={() => {
                            setDonation(
                              item
                            );

                            if (
                              item.driver
                            ) {
                              setDriverLocation(
                                {
                                  currentArea:
                                    item
                                      .driver
                                      .currentArea,
                                  headingTo:
                                    item
                                      .driver
                                      .headingTo,
                                  eta:
                                    item
                                      .driver
                                      .eta,
                                  distance:
                                    item
                                      .driver
                                      .distance,
                                }
                              );
                            }

                            setActiveTab(
                              "Donations"
                            );
                          }}
                          style={{
                            padding:
                              "9px 13px",
                            border:
                              "1px solid #d7ded9",
                            borderRadius:
                              "8px",
                            background:
                              "#fff",
                            cursor:
                              "pointer",
                            fontWeight:
                              "700",
                          }}
                        >
                          View Details
                        </button>

                        {(item.status ===
                          "POSTED" ||
                          item.status ===
                            "MATCHED") && (

                          <>
                            <button
                              onClick={() =>
                                openEditDonation(
                                  item
                                )
                              }
                              style={{
                                padding:
                                  "9px 13px",
                                border:
                                  "1px solid #cbd8d0",
                                borderRadius:
                                  "8px",
                                background:
                                  "#f6faf7",
                                cursor:
                                  "pointer",
                                fontWeight:
                                  "700",
                              }}
                            >
                              ✏️ Edit
                            </button>

                            <button
                              onClick={() =>
                                cancelDonation(
                                  item
                                )
                              }
                              style={{
                                padding:
                                  "9px 13px",
                                border:
                                  "1px solid #e2aaaa",
                                borderRadius:
                                  "8px",
                                background:
                                  "#fff8f8",
                                color:
                                  "#a33",
                                cursor:
                                  "pointer",
                                fontWeight:
                                  "700",
                              }}
                            >
                              Cancel
                            </button>
                          </>

                        )}

                      </div>

                    </div>

                  )
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
            donation.driver &&
            donation.status !==
              "CANCELLED" ? (

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

                  <div className="live-map-card">
                    <div className="live-map-header">
                      <div><span>LIVE ROUTE</span><strong>Simulated driver location</strong></div>
                      <div className="map-live-pill"><span /> LIVE</div>
                    </div>
                    <div className="map-canvas">
                      <div className="map-grid-lines" />
                      <div className="map-road road-one" />
                      <div className="map-road road-two" />
                      <div className="map-road road-three" />
                      <div className="map-road road-four" />
                      <div className="map-route-shadow" />
                      <div className="map-route-fill" style={{ width: `${getMapProgress()}%` }} />
                      <div className="map-pin pickup-pin"><span>📦</span><small>Pickup</small></div>
                      <div className="map-driver-marker" style={{ left: `${Math.min(92, Math.max(8, getMapProgress()))}%` }}><div className="driver-pulse" /><span>{getDriverIcon()}</span></div>
                      <div className="map-pin ngo-pin"><span>🏠</span><small>NGO</small></div>
                    </div>
                    <div className="map-route-info">
                      <div><small>FROM</small><strong>{donation.location || "Pickup Location"}</strong></div>
                      <div className="map-arrow">→</div>
                      <div><small>TO</small><strong>{donation.matchedNGO?.name || "Community NGO"}</strong></div>
                    </div>
                    <div className="map-disclaimer">📍 Simulated live tracking for MVP demonstration</div>
                  </div>

                  <div className="route-progress-label">

                    {donation.status ===
                    "DRIVER ASSIGNED"
                      ? "Driver is waiting at pickup location"
                      : donation.status ===
                            "DELIVERED" ||
                          (driverLocation?.distance ??
                            donation?.driver
                              ?.distance ??
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
                    Delivery Partner
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
                    🚗{" "}
                    {donation.driver.vehicleType ||
                      "Delivery Vehicle"}
                  </p>

                  <p>
                    🔢{" "}
                    {donation.driver.vehicleNumber ||
                      "Vehicle number unavailable"}
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

                  {/* CONTACT BUTTONS */}

                  <div
                    style={{
                      display:
                        "flex",
                      gap:
                        "9px",
                      marginTop:
                        "16px",
                    }}
                  >

                    <a
                      href={`tel:${donation.driver.phone}`}
                      style={{
                        flex: 1,
                        textAlign:
                          "center",
                        textDecoration:
                          "none",
                        padding:
                          "11px 8px",
                        borderRadius:
                          "9px",
                        background:
                          "#244d3b",
                        color:
                          "#fff",
                        fontWeight:
                          "700",
                      }}
                    >
                      📞 Call
                    </a>

                    <a
                      href={`sms:${donation.driver.phone}`}
                      style={{
                        flex: 1,
                        textAlign:
                          "center",
                        textDecoration:
                          "none",
                        padding:
                          "11px 8px",
                        borderRadius:
                          "9px",
                        background:
                          "#eef5f0",
                        color:
                          "#244d3b",
                        fontWeight:
                          "700",
                      }}
                    >
                      💬 Message
                    </a>

                  </div>

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

      {/* =====================================================
          EDIT DONATION MODAL
      ===================================================== */}

      {editingDonation && (

        <div
          style={{
            position:
              "fixed",
            inset: 0,
            background:
              "rgba(15,25,20,0.55)",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            zIndex: 1000,
            padding:
              "20px",
          }}
        >

          <div
            style={{
              width:
                "min(560px, 100%)",
              background:
                "#fff",
              borderRadius:
                "18px",
              padding:
                "26px",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "20px",
              }}
            >

              <div>

                <h2
                  style={{
                    margin:
                      "0 0 5px",
                    color:
                      "#20362c",
                  }}
                >
                  ✏️ Edit Donation
                </h2>

                <p
                  style={{
                    margin:
                      "0",
                    color:
                      "#6d7771",
                  }}
                >
                  Update your donation
                  details.
                </p>

              </div>

              <button
                onClick={
                  closeEditDonation
                }
                style={{
                  border:
                    "none",
                  background:
                    "#f1f4f1",
                  borderRadius:
                    "50%",
                  width:
                    "36px",
                  height:
                    "36px",
                  cursor:
                    "pointer",
                  fontSize:
                    "18px",
                }}
              >
                ×
              </button>

            </div>

            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap:
                  "15px",
              }}
            >

              <div className="field">

                <label>
                  Food Type
                </label>

                <input
                  value={
                    editFoodType
                  }
                  onChange={(e) =>
                    setEditFoodType(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="field">

                <label>
                  Quantity (kg)
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    editQuantity
                  }
                  onChange={(e) =>
                    setEditQuantity(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="field">

                <label>
                  Pickup Location
                </label>

                <input
                  value={
                    editLocation
                  }
                  onChange={(e) =>
                    setEditLocation(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="field">

                <label>
                  Safe Until
                </label>

                <input
                  type="time"
                  value={
                    editExpiryTime
                  }
                  onChange={(e) =>
                    setEditExpiryTime(
                      e.target.value
                    )
                  }
                />

              </div>

            </div>

            <div
              style={{
                display:
                  "flex",
                gap:
                  "10px",
                marginTop:
                  "22px",
              }}
            >

              <button
                onClick={
                  closeEditDonation
                }
                style={{
                  flex: 1,
                  padding:
                    "12px",
                  border:
                    "1px solid #d5ddd7",
                  borderRadius:
                    "10px",
                  background:
                    "#fff",
                  cursor:
                    "pointer",
                  fontWeight:
                    "700",
                }}
              >
                Cancel
              </button>

              <button
                className="primary-btn"
                onClick={
                  saveEditedDonation
                }
                style={{
                  flex: 1,
                }}
              >
                Save Changes
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;