const express = require("express");
const router = express.Router();
const axiomController = require("../controllers/axiomController");

router.get("/", axiomController.getAxiomData);

module.exports = router;
