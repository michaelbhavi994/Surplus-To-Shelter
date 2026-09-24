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

  const [stats, setStats] = useState({
    meals: 0,
    kg: 0,
    co2: 0,
    deliveries: 0,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      // STEP 1: Create donation
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
        throw new Error(data.message);
      }

      // STEP 2: Match NGO
      const matchResponse = await fetch(
        `http://127.0.0.1:5000/api/match/${data.donation.id}`,
        {
          method: "POST",
        }
      );

      const matchData = await matchResponse.json();

      if (!matchResponse.ok) {
        throw new Error(matchData.message);
      }

      // Save donation
      setDonation(matchData.donation);

      // Update impact statistics ONCE
      const donatedKg = Number(
        matchData.donation.quantity
      );

      setStats((prev) => ({
        ...prev,
        meals:
          prev.meals +
          Math.round(donatedKg * 2),

        kg:
          prev.kg +
          donatedKg,

        co2: Number(
          (
            prev.co2 +
            donatedKg * 0.82
          ).toFixed(1)
        ),
      }));

      // Clear form
      setFoodType("");
      setQuantity("");
      setLocation("");
      setExpiryTime("");

    } catch (error) {
      console.error(error);

      alert(
        error.message ||
        "Something went wrong"
      );
    }

    setLoading(false);
  };

  // ASSIGN DRIVER
  const assignDriver = async () => {
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/assign-driver/${donation.id}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setDonation(data.donation);

      setDriverLocation({
        currentArea:
          data.donation.driver.currentArea,

        eta:
          data.donation.driver.eta,

        distance:
          data.donation.driver.distance,
      });

    } catch (error) {
      alert(error.message);
    }
  };

  // LIVE AREA TRACKING
  useEffect(() => {
    if (
      !donation ||
      !donation.driver ||
      donation.status !== "DRIVER ASSIGNED"
    ) {
      return;
    }

    const interval = setInterval(
      async () => {
        try {
          const response = await fetch(
            `http://127.0.0.1:5000/api/driver-location/${donation.id}`,
            {
              method: "PUT",
            }
          );

          const data =
            await response.json();

          if (data.donation) {
            setDonation(data.donation);

            setDriverLocation({
              currentArea:
                data.donation.driver
                  .currentArea,

              eta:
                data.donation.driver
                  .eta,

              distance:
                data.donation.driver
                  .distance,
            });
          }

        } catch (error) {
          console.error(
            "Location update error:",
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

  // UPDATE DELIVERY STATUS
  const updateStatus = async (
    status
  ) => {
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
          data.message
        );
      }

      setDonation(data.donation);

      // Count completed delivery
      if (
        status === "DELIVERED"
      ) {
        setStats((prev) => ({
          ...prev,
          deliveries:
            prev.deliveries + 1,
        }));
      }

    } catch (error) {
      alert(error.message);
    }
  };

  // STATUS HELPERS
  const isStatusActive = (
    status
  ) => {
    const order = [
      "POSTED",
      "MATCHED",
      "DRIVER ASSIGNED",
      "PICKED UP",
      "DELIVERED",
    ];

    const currentIndex =
      order.indexOf(
        donation?.status
      );

    const statusIndex =
      order.indexOf(status);

    return (
      currentIndex >=
      statusIndex
    );
  };

  return (
    <div className="app">

      {/* HEADER */}

      <div className="header">

        <h1>
          🍱 Surplus-to-Shelter
        </h1>

        <p>
          Real-Time Food Rescue
          & Distribution Platform
        </p>

      </div>

      {/* IMPACT DASHBOARD */}

      <div className="dashboard">

        <div className="stat-card">

          <h3>
            🍽️ Meals Rescued
          </h3>

          <div className="number">
            {stats.meals}
          </div>

        </div>

        <div className="stat-card">

          <h3>
            ⚖️ Food Diverted
          </h3>

          <div className="number">
            {stats.kg.toFixed(1)} kg
          </div>

        </div>

        <div className="stat-card">

          <h3>
            🌱 CO₂e Avoided
          </h3>

          <div className="number">
            {stats.co2.toFixed(1)} kg
          </div>

        </div>

        <div className="stat-card">

          <h3>
            🚚 Deliveries Completed
          </h3>

          <div className="number">
            {stats.deliveries}
          </div>

        </div>

      </div>

      {/* DONATION FORM */}

      <div className="form-card">

        <h2>
          🍱 Donate Surplus Food
        </h2>

        <form
          onSubmit={handleSubmit}
        >

          <div className="form-group">

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
              placeholder="e.g. Rice, Dal, Roti"
              required
            />

          </div>

          <div className="form-group">

            <label>
              Quantity (kg)
            </label>

            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  e.target.value
                )
              }
              placeholder="e.g. 20"
              required
            />

          </div>

          <div className="form-group">

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
              placeholder="e.g. C-Scheme, Jaipur"
              required
            />

          </div>

          <div className="form-group">

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

          <button
            className="submit-btn"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "MATCHING..."
              : "POST DONATION"}
          </button>

        </form>

        {/* DONATION RESULT */}

        {donation && (

          <div className="match-result">

            <h2>
              🤝 Donation Matched!
            </h2>

            <p>
              <strong>
                Food:
              </strong>{" "}
              {donation.foodType}
            </p>

            <p>
              <strong>
                Quantity:
              </strong>{" "}
              {donation.quantity} kg
            </p>

            <p>
              <strong>
                Pickup:
              </strong>{" "}
              {donation.location}
            </p>

            <p>
              <strong>
                Safe Until:
              </strong>{" "}
              {donation.expiryTime}
            </p>

            <p>
              <strong>
                Status:
              </strong>{" "}
              {donation.status}
            </p>

            {/* STATUS TIMELINE */}

            <div className="status-timeline">

              <div
                className={`status-step ${
                  isStatusActive(
                    "POSTED"
                  )
                    ? "active"
                    : ""
                }`}
              >
                POSTED
              </div>

              <div
                className={`status-step ${
                  isStatusActive(
                    "MATCHED"
                  )
                    ? "active"
                    : ""
                }`}
              >
                MATCHED
              </div>

              <div
                className={`status-step ${
                  isStatusActive(
                    "DRIVER ASSIGNED"
                  )
                    ? "active"
                    : ""
                }`}
              >
                DRIVER
              </div>

              <div
                className={`status-step ${
                  isStatusActive(
                    "PICKED UP"
                  )
                    ? "active"
                    : ""
                }`}
              >
                PICKED UP
              </div>

              <div
                className={`status-step ${
                  isStatusActive(
                    "DELIVERED"
                  )
                    ? "active"
                    : ""
                }`}
              >
                DELIVERED
              </div>

            </div>

            {/* NGO */}

            {donation.matchedNGO && (

              <div className="ngo-box">

                <h3>
                  🏠 Matched NGO
                </h3>

                <p>
                  <strong>
                    Name:
                  </strong>{" "}
                  {donation.matchedNGO.name}
                </p>

                <p>
                  <strong>
                    Location:
                  </strong>{" "}
                  {donation.matchedNGO.location}
                </p>

                <p>
                  <strong>
                    Capacity:
                  </strong>{" "}
                  {donation.matchedNGO.capacity} kg
                </p>

                <p>
                  <strong>
                    Need:
                  </strong>{" "}
                  {donation.matchedNGO.need.toUpperCase()}
                </p>

              </div>

            )}

            {/* DRIVER */}

            {donation.driver && (

              <div className="driver-box">

                <h3>
                  🚗 Driver Tracking
                </h3>

                <p>
                  <strong>
                    Driver:
                  </strong>{" "}
                  {donation.driver.name}
                </p>

                <p>
                  <strong>
                    Phone:
                  </strong>{" "}
                  {donation.driver.phone}
                </p>

                <p>
                  <strong>
                    Status:
                  </strong>{" "}
                  {donation.driver.status}
                </p>

                {driverLocation && (

                  <div className="location-box">

                    <h3>
                      📍 Live Driver Location
                    </h3>

                    <p>
                      <strong>
                        Current Area:
                      </strong>{" "}
                      {
                        driverLocation.currentArea
                      }
                    </p>

                    <p>
                      <strong>
                        Destination:
                      </strong>{" "}
                      {
                        donation
                          .matchedNGO
                          ?.name
                      }
                    </p>

                    <p>
                      <strong>
                        Distance Remaining:
                      </strong>{" "}
                      {
                        driverLocation.distance.toFixed(
                          1
                        )
                      }{" "}
                      km
                    </p>

                    <p>
                      <strong>
                        Estimated Arrival:
                      </strong>{" "}
                      {
                        driverLocation.eta
                      }{" "}
                      min
                    </p>

                    <p>
                      🟢 Driver is on the way
                    </p>

                    <p>
                      🔄 Route updates every
                      3 seconds
                    </p>

                  </div>

                )}

              </div>

            )}

            {/* ASSIGN DRIVER */}

            {donation.status ===
              "MATCHED" && (

              <button
                className="action-btn"
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
                className="action-btn"
                onClick={() =>
                  updateStatus(
                    "PICKED UP"
                  )
                }
              >
                📦 MARK AS PICKED UP
              </button>

            )}

            {/* DELIVERY */}

            {donation.status ===
              "PICKED UP" && (

              <button
                className="action-btn"
                onClick={() =>
                  updateStatus(
                    "DELIVERED"
                  )
                }
              >
                🏠 MARK AS DELIVERED
              </button>

            )}

            {/* SUCCESS */}

            {donation.status ===
              "DELIVERED" && (

              <div className="success-box">

                🎉 Food successfully
                delivered!

                <br />

                ❤️ Another surplus meal
                saved from waste.

              </div>

            )}

          </div>

        )}

      </div>

    </div>
  );
}

export default App;