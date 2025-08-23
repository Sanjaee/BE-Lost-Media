const axios = require("axios");

const axiomController = {
  getAxiomData: async (req, res) => {
    try {
      const url = "https://api2.axiom.trade/pulse";
      const body = {
        table: "finalStretch",
        filters: {
          age: { min: null, max: null },
          atLeastOneSocial: false,
          bondingCurve: { min: null, max: null },
          botUsers: { min: null, max: null },
          bundle: { min: null, max: null },
          devHolding: { min: null, max: null },
          dexPaid: false,
          excludeKeywords: [],
          fees: { min: null, max: null },
          holders: { min: null, max: null },
          insiders: { min: null, max: null },
          liquidity: { min: null, max: null },
          marketCap: { min: 266.6666666666667, max: null },
          mustEndInPump: false,
          numBuys: { min: null, max: null },
          numMigrations: { min: null, max: null },
          numSells: { min: null, max: null },
          protocols: {
            raydium: false,
            pumpAmm: false,
            pump: true,
            moonshot: true,
            moonshotApp: true,
            launchLab: true,
          },
          searchKeywords: [],
          snipers: { min: null, max: null },
          telegram: false,
          top10Holders: { min: null, max: null },
          twitter: { min: null, max: null },
          twitterExists: false,
          txns: { min: null, max: null },
          volume: { min: null, max: null },
          website: false,
        },
        usdPerSol: 150,
      };

      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        // NOTE: simpan cookie ini di env kalau production
        Cookie:
          "auth-refresh-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZWZyZXNoVG9rZW5JZCI6IjU5M2FiNzhkLTQ2ZTUtNDRmYS1iMmZkLWRmODE1ZjIwYzczYiIsImlhdCI6MTc1MTk4MzE5OH0.Z-dJFF_ajmGmmSjVu_2iRtmkhD5_4WVCX3owS0tDEG8; auth-access-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoZW50aWNhdGVkVXNlcklkIjoiYjZlMDc1OTMtN2FmZi00ODQwLWIwZmItNWZjYzFhOTE1NjlkIiwiaWF0IjoxNzU1OTIyMjM5LCJleHAiOjE3NTU5MjMxOTl9.0ntEqZmyOWIEgGEemBIo5jLmroGatfK6I6rTY-DYBFg",
      };

      const axiomResponse = await axios.post(url, body, {
        headers,
        timeout: 15000,
      });

      console.log(
        `Successfully fetched ${axiomResponse.data?.length || 0} records`
      );

      // kirim apa adanya (response.data biasanya array)
      return res.status(200).json({
        success: true,
        data: axiomResponse.data,
        message: "data fetched successfully",
      });
    } catch (err) {
      console.error("fetch error:", err.message || err);

      // Kalau axios dapat response error (status != 2xx), sertakan body response bila ada
      if (err.response) {
        return res.status(err.response.status).json({
          success: false,
          message: "API Error",
          status: err.response.status,
          data: err.response.data,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: err.message,
      });
    }
  },

  // Get data for internal use (returns data without response)
  fetchAxiomData: async () => {
    try {
      const url = "https://api2.axiom.trade/pulse";
      const body = {
        table: "finalStretch",
        filters: {
          age: { min: null, max: null },
          atLeastOneSocial: false,
          bondingCurve: { min: null, max: null },
          botUsers: { min: null, max: null },
          bundle: { min: null, max: null },
          devHolding: { min: null, max: null },
          dexPaid: false,
          excludeKeywords: [],
          fees: { min: null, max: null },
          holders: { min: null, max: null },
          insiders: { min: null, max: null },
          liquidity: { min: null, max: null },
          marketCap: { min: 266.6666666666667, max: null },
          mustEndInPump: false,
          numBuys: { min: null, max: null },
          numMigrations: { min: null, max: null },
          numSells: { min: null, max: null },
          protocols: {
            raydium: false,
            pumpAmm: false,
            pump: true,
            moonshot: true,
            moonshotApp: true,
            launchLab: true,
          },
          searchKeywords: [],
          snipers: { min: null, max: null },
          telegram: false,
          top10Holders: { min: null, max: null },
          twitter: { min: null, max: null },
          twitterExists: false,
          txns: { min: null, max: null },
          volume: { min: null, max: null },
          website: false,
        },
        usdPerSol: 150,
      };

      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie:
          "auth-refresh-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZWZyZXNoVG9rZW5JZCI6IjU5M2FiNzhkLTQ2ZTUtNDRmYS1iMmZkLWRmODE1ZjIwYzczYiIsImlhdCI6MTc1MTk4MzE5OH0.Z-dJFF_ajmGmmSjVu_2iRtmkhD5_4WVCX3owS0tDEG8; auth-access-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoZW50aWNhdGVkVXNlcklkIjoiYjZlMDc1OTMtN2FmZi00ODQwLWIwZmItNWZjYzFhOTE1NjlkIiwiaWF0IjoxNzU1OTIyMjM5LCJleHAiOjE3NTU5MjMxOTl9.0ntEqZmyOWIEgGEemBIo5jLmroGatfK6I6rTY-DYBFg",
      };

      const axiomResponse = await axios.post(url, body, {
        headers,
        timeout: 15000,
      });

      console.log(
        `Successfully fetched ${
          axiomResponse.data?.length || 0
        } records for internal use`
      );
      return axiomResponse.data;
    } catch (err) {
      console.error("fetch error (internal):", err.message || err);
      return null;
    }
  },
};

module.exports = axiomController;
