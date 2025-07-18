"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenType = void 0;
/**
 * Authentication token types supported by the system
 */
var TokenType;
(function (TokenType) {
    TokenType["JWT"] = "jwt";
    TokenType["EMAIL"] = "email";
    TokenType["DEVELOPMENT"] = "development";
})(TokenType || (exports.TokenType = TokenType = {}));
