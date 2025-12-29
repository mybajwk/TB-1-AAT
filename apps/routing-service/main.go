package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
)

type ClassifyRequest struct {
	Description string `json:"description"`
}

type ClassifyResponse struct {
	Category  string  `json:"category"`
	Authority string  `json:"authority"`
	Confidence float64 `json:"confidence"`
}

func classifyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ClassifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Mock Classification Logic
	desc := strings.ToLower(req.Description)
	category := "general"
	authority := "City Hall"
	confidence := 0.85

	if strings.Contains(desc, "sampah") || strings.Contains(desc, "kotor") {
		category = "cleanliness"
		authority = "Dinas Kebersihan"
		confidence = 0.95
	} else if strings.Contains(desc, "jalan") || strings.Contains(desc, "lubang") {
		category = "infrastructure"
		authority = "Dinas PU"
		confidence = 0.92
	} else if strings.Contains(desc, "macet") || strings.Contains(desc, "parkir") {
		category = "traffic"
		authority = "Dinas Perhubungan"
		confidence = 0.88
	}

	response := ClassifyResponse{
		Category:   category,
		Authority:  authority,
		Confidence: confidence,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "Routing Service is running"}`))
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/classify", classifyHandler)

	fmt.Printf("Routing Service running on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
