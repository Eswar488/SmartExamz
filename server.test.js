"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { getLocalNetworkUrls } = require("./server.js");

test("local network URLs prefer Wi-Fi and omit loopback, public, and IPv6 addresses", () => {
  const urls = getLocalNetworkUrls(4173, {
    en1: [
      { address: "192.168.1.20", family: "IPv4", internal: false },
      { address: "203.0.113.15", family: "IPv4", internal: false },
      { address: "fe80::1", family: "IPv6", internal: false },
    ],
    en0: [{ address: "10.0.0.15", family: "IPv4", internal: false }],
    lo0: [{ address: "127.0.0.1", family: "IPv4", internal: true }],
  });

  assert.deepEqual(urls, [
    { name: "en0", url: "http://10.0.0.15:4173" },
    { name: "en1", url: "http://192.168.1.20:4173" },
  ]);
});
