#include <iostream>
#include <string>
#include <nlohmann/json.hpp>
#include "../../include/analysis/AnalysisSession.hpp"

using json = nlohmann::json;

void handle_request(const json& req) {
    json response;
    
    // Minimal error handling for missing fields
    if (!req.contains("requestId") || !req["requestId"].is_string()) {
        response["success"] = false;
        response["error"] = {
            {"code", "INVALID_REQUEST"},
            {"message", "Missing or invalid requestId"}
        };
        std::cout << response.dump() << std::endl;
        return;
    }

    std::string req_id = req["requestId"];
    response["requestId"] = req_id;

    if (!req.contains("operation") || !req["operation"].is_string()) {
        response["success"] = false;
        response["error"] = {
            {"code", "INVALID_OPERATION"},
            {"message", "Missing or invalid operation"}
        };
        std::cout << response.dump() << std::endl;
        return;
    }

    std::string operation = req["operation"];

    if (operation == "health") {
        response["success"] = true;
        response["payload"] = {
            {"engine", "Code_Reviewer Native Engine"},
            {"version", "0.1.0"},
            {"platform", "windows"}
        };
    } else if (operation == "analyze") {
        if (!req.contains("payload") || !req["payload"].is_object()) {
            response["success"] = false;
            response["error"] = {{"code", "INVALID_PAYLOAD"}, {"message", "Missing payload for analyze"}};
        } else {
            auto payload = req["payload"];
            std::string sessionId = payload.value("sessionId", "");
            std::string workspacePath = payload.value("workspacePath", "");
            nlohmann::json manifest = payload.value("manifest", nlohmann::json::object());

            try {
                CodeReviewer::Analysis::AnalysisSession session(sessionId, workspacePath);
                session.setupDefaultRules();
                auto result = session.run(manifest);

                response["success"] = true;
                response["payload"] = result;
            } catch (const std::exception& e) {
                response["success"] = false;
                response["error"] = {{"code", "ANALYSIS_EXCEPTION"}, {"message", e.what()}};
            }
        }
    } else {
        response["success"] = false;
        response["error"] = {
            {"code", "UNKNOWN_OPERATION"},
            {"message", "Operation not supported"}
        };
    }

    std::cout << response.dump() << std::endl;
}

int main() {
    // Ensure standard output is not buffered to avoid hanging the IPC
    std::setvbuf(stdout, nullptr, _IONBF, 0);

    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;

        try {
            json req = json::parse(line);
            handle_request(req);
        } catch (const json::parse_error& e) {
            json response;
            response["success"] = false;
            response["error"] = {
                {"code", "PARSE_ERROR"},
                {"message", e.what()}
            };
            std::cout << response.dump() << std::endl;
        }
    }

    return 0;
}
