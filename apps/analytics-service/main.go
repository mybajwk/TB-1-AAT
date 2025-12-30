package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

type StatsResponse struct {
	TotalReports      int            `json:"total_reports"`
	SolvedReports     int            `json:"solved_reports"`
	PendingReports    int            `json:"pending_reports"`
	ReportsByCategory map[string]int `json:"reports_by_category"`
}

func statsHandler(w http.ResponseWriter, r *http.Request) {
	// Mock Analytics Data
	stats := StatsResponse{
		TotalReports:   1250,
		SolvedReports:  980,
		PendingReports: 270,
		ReportsByCategory: map[string]int{
			"cleanliness":    450,
			"infrastructure": 300,
			"traffic":        500,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "Analytics Service is running"}`))
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/stats", statsHandler)

	fmt.Printf("Analytics Service running on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
