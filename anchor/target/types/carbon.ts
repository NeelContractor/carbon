/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/carbon.json`.
 */
export type Carbon = {
  "address": "4WEXh5GfWzfAyxmhAdVC5VFLxhj9hsv5zo7t6CeQMf5B",
  "metadata": {
    "name": "carbon",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "burnCtForCompliance",
      "discriminator": [
        123,
        240,
        155,
        55,
        209,
        223,
        145,
        5
      ],
      "accounts": [
        {
          "name": "industryAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  100,
                  117,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "ctMint",
          "writable": true
        },
        {
          "name": "industryCtAccount",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "emissionAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "cancelAuction",
      "discriminator": [
        156,
        43,
        197,
        110,
        218,
        105,
        143,
        182
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.batch_number",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "claimTokens",
      "discriminator": [
        108,
        216,
        210,
        231,
        0,
        212,
        42,
        64
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.batch_number",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "bid",
          "writable": true
        },
        {
          "name": "industryAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  100,
                  117,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bid.bidder",
                "account": "bid"
              }
            ]
          }
        },
        {
          "name": "ctMint",
          "writable": true
        },
        {
          "name": "industryCtAccount",
          "writable": true
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createAuction",
      "discriminator": [
        234,
        6,
        201,
        246,
        47,
        219,
        176,
        107
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "batchNumber"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "batchNumber",
          "type": "u32"
        },
        {
          "name": "totalTokens",
          "type": "u64"
        },
        {
          "name": "startPrice",
          "type": "u64"
        },
        {
          "name": "reservePrice",
          "type": "u64"
        },
        {
          "name": "durationSeconds",
          "type": "i64"
        }
      ]
    },
    {
      "name": "depositBond",
      "discriminator": [
        120,
        89,
        18,
        253,
        112,
        125,
        87,
        255
      ],
      "accounts": [
        {
          "name": "industryAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  100,
                  117,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "bondVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "industryAccount"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "finalizeAuction",
      "discriminator": [
        220,
        209,
        175,
        193,
        57,
        132,
        241,
        168
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.batch_number",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "ctMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "mintAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "placeBid",
      "discriminator": [
        238,
        77,
        148,
        91,
        200,
        151,
        92,
        146
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.batch_number",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              },
              {
                "kind": "arg",
                "path": "timestamp"
              }
            ]
          }
        },
        {
          "name": "industryAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  100,
                  117,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tokenAmount",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "u64"
        }
      ]
    },
    {
      "name": "registerIndustry",
      "discriminator": [
        201,
        90,
        86,
        231,
        244,
        251,
        118,
        153
      ],
      "accounts": [
        {
          "name": "industryAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  100,
                  117,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "companyName",
          "type": "string"
        },
        {
          "name": "bondAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "submitEmissionReport",
      "discriminator": [
        171,
        77,
        48,
        154,
        185,
        111,
        134,
        2
      ],
      "accounts": [
        {
          "name": "industryAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  100,
                  117,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "emissionReport",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110,
                  95,
                  114,
                  101,
                  112,
                  111,
                  114,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "industryAccount"
              },
              {
                "kind": "arg",
                "path": "timestamp"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "co2Emitted",
          "type": "u64"
        },
        {
          "name": "reportPeriod",
          "type": "string"
        },
        {
          "name": "timestamp",
          "type": "u64"
        }
      ]
    },
    {
      "name": "verifyIndustry",
      "discriminator": [
        28,
        228,
        45,
        142,
        34,
        205,
        83,
        20
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "industryAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  100,
                  117,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "industry_account.authority",
                "account": "industryAccount"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "withdrawBond",
      "discriminator": [
        222,
        199,
        141,
        31,
        188,
        93,
        155,
        40
      ],
      "accounts": [
        {
          "name": "industryAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  100,
                  117,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "bondVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "industryAccount"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawProceeds",
      "discriminator": [
        124,
        68,
        215,
        12,
        201,
        136,
        54,
        72
      ],
      "accounts": [
        {
          "name": "auction",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction.batch_number",
                "account": "auction"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "auction",
      "discriminator": [
        218,
        94,
        247,
        242,
        126,
        233,
        131,
        81
      ]
    },
    {
      "name": "bid",
      "discriminator": [
        143,
        246,
        48,
        245,
        42,
        145,
        180,
        88
      ]
    },
    {
      "name": "emissionReport",
      "discriminator": [
        121,
        165,
        24,
        27,
        53,
        75,
        43,
        134
      ]
    },
    {
      "name": "industryAccount",
      "discriminator": [
        41,
        249,
        255,
        196,
        18,
        5,
        128,
        179
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientBond",
      "msg": "Insufficient bond amount. Minimum 1 SOL required."
    },
    {
      "code": 6001,
      "name": "notVerified",
      "msg": "Industry is not verified yet."
    },
    {
      "code": 6002,
      "name": "alreadyVerified",
      "msg": "Industry is already verified."
    },
    {
      "code": 6003,
      "name": "insufficientCt",
      "msg": "Insufficient CT balance."
    },
    {
      "code": 6004,
      "name": "notCompliant",
      "msg": "Industry is not compliant. Cannot withdraw bond."
    },
    {
      "code": 6005,
      "name": "invalidPricing",
      "msg": "Invalid pricing: start price must be greater than reserve price."
    },
    {
      "code": 6006,
      "name": "invalidDuration",
      "msg": "Invalid duration: must be greater than 0."
    },
    {
      "code": 6007,
      "name": "invalidTokenAmount",
      "msg": "Invalid token amount."
    },
    {
      "code": 6008,
      "name": "auctionNotActive",
      "msg": "Auction is not active."
    },
    {
      "code": 6009,
      "name": "auctionEnded",
      "msg": "Auction has already ended."
    },
    {
      "code": 6010,
      "name": "insufficientTokens",
      "msg": "Insufficient tokens remaining."
    },
    {
      "code": 6011,
      "name": "mathOverflow",
      "msg": "Math overflow occurred."
    },
    {
      "code": 6012,
      "name": "invalidAuctionStatus",
      "msg": "Invalid auction status for this operation."
    },
    {
      "code": 6013,
      "name": "auctionNotEnded",
      "msg": "Auction has not ended yet."
    },
    {
      "code": 6014,
      "name": "auctionNotFinalized",
      "msg": "Auction has not been finalized yet."
    },
    {
      "code": 6015,
      "name": "bidAlreadyProcessed",
      "msg": "Bid has already been processed."
    },
    {
      "code": 6016,
      "name": "hasParticipants",
      "msg": "Cannot cancel auction with participants."
    },
    {
      "code": 6017,
      "name": "insufficientFunds",
      "msg": "Insufficient funds in account."
    },
    {
      "code": 6018,
      "name": "invalidTokenAccount",
      "msg": "Invalid token account."
    }
  ],
  "types": [
    {
      "name": "auction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "batchNumber",
            "type": "u32"
          },
          {
            "name": "totalTokens",
            "type": "u64"
          },
          {
            "name": "tokensRemaining",
            "type": "u64"
          },
          {
            "name": "startPrice",
            "type": "u64"
          },
          {
            "name": "currentPrice",
            "type": "u64"
          },
          {
            "name": "reservePrice",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "auctionStatus"
              }
            }
          },
          {
            "name": "totalRaised",
            "type": "u64"
          },
          {
            "name": "participantCount",
            "type": "u32"
          },
          {
            "name": "tokensSold",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "auctionStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "completed"
          },
          {
            "name": "finalized"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "bid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "industry",
            "type": "pubkey"
          },
          {
            "name": "tokenAmount",
            "type": "u64"
          },
          {
            "name": "pricePerToken",
            "type": "u64"
          },
          {
            "name": "totalCost",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "bidStatus"
              }
            }
          }
        ]
      }
    },
    {
      "name": "bidStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "accepted"
          },
          {
            "name": "refunded"
          }
        ]
      }
    },
    {
      "name": "complianceStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "compliant"
          },
          {
            "name": "nonCompliant"
          },
          {
            "name": "warning"
          }
        ]
      }
    },
    {
      "name": "emissionReport",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "industry",
            "type": "pubkey"
          },
          {
            "name": "co2Emitted",
            "type": "u64"
          },
          {
            "name": "reportPeriod",
            "type": "string"
          },
          {
            "name": "submittedAt",
            "type": "i64"
          },
          {
            "name": "verified",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "industryAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "companyName",
            "type": "string"
          },
          {
            "name": "bondAmount",
            "type": "u64"
          },
          {
            "name": "verified",
            "type": "bool"
          },
          {
            "name": "ctBalance",
            "type": "u64"
          },
          {
            "name": "totalPurchased",
            "type": "u64"
          },
          {
            "name": "totalBurned",
            "type": "u64"
          },
          {
            "name": "complianceStatus",
            "type": {
              "defined": {
                "name": "complianceStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "bondVaultBump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
