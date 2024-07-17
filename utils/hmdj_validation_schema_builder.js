let kOBJ_SCHEMA = {
    "type": "object",
    "properties": {
        "id": {
            "description": "The unique identifier for a context",
            "type": "string"
        },
        "relationships": {
            "description": "The relationships array",
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "description": "The type of relationship the context can have",
                        "type": "string"
                    },
                    "context": {
                        "description": "The related related",
                        "type": "string"
                    },
                    "dag": {
                        "description": "Should this relation be enlisted on a DAG?",
                        "type": "boolean"
                    }
                },
                "required": ["type", "context", "dag"]
            },
            "minItems": 0,
            "uniqueItems": true
        },
        "properties": {
            "description": "Style properties",
            "type": "array",
            "items": {
                "type": "string"
            }
        },
        "label": {
            "description": "Node label",
            "type": ["string", "null"]
        },
        "description": {
            "description": "Node description",
            "type": ["string", "null"]
        },
        "url": {
            "description": "The resource url",
            "type": [
                "string",
                "null"
            ]
        }
    },
    "required": ["id", "relationships"]
};

let kSCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://github.com/lab-archeologia-digitale/directus-extension-harris-matrix/hmdj.schema.json",
    "title": "HARRIS MATRIX DATA JSON validation schema",
    "description": "A proposal fora a Harris Matrix digital data standard",
};

let kSCHEMA_ARR = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://github.com/lab-archeologia-digitale/directus-extension-harris-matrix/hmdj_arr.schema.json",
    "title": "HARRIS MATRIX DATA JSON validation schema [ARR]",
    "description": "A proposal fora a Harris Matrix digital data standard (in array mode)",
    "type": "array",
    "items": {
        
    },
    "minItems": 0,
    "uniqueItems": true
};

let kSCHEMA_PATTERN = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://github.com/lab-archeologia-digitale/directus-extension-harris-matrix/hmdj_dict.schema.json",
    "title": "HARRIS MATRIX DATA JSON validation schema [DICT]",
    "description": "A proposal fora a Harris Matrix digital data standard (in dict mode)",
    "type": "object",
    "patternProperties": {
        "^\\w+$": {}
    }
};

function buildSchema(type) {
    if (type == "array") {
        var ks = Object.assign({}, kSCHEMA_ARR);
        ks["items"]["type"] = kOBJ_SCHEMA["type"];
        ks["items"]["properties"] = kOBJ_SCHEMA["properties"];
        ks["items"]["required"] = kOBJ_SCHEMA["required"];
    } else if (type == "dict") {
        var ks = Object.assign({}, kSCHEMA_PATTERN);
        ks["patternProperties"]["^\\w+$"]["type"] = kOBJ_SCHEMA["type"];
        ks["patternProperties"]["^\\w+$"]["properties"] = kOBJ_SCHEMA["properties"];
        ks["patternProperties"]["^\\w+$"]["required"] = kOBJ_SCHEMA["required"];
    } else {
        var ks = Object.assign({}, kSCHEMA);
        ks["type"] = kOBJ_SCHEMA["type"];
        ks["properties"] = kOBJ_SCHEMA["properties"];
        ks["required"] = kOBJ_SCHEMA["required"];
    }
    
    return ks;
}

function printSchema(type) {
    console.log(JSON.stringify(buildSchema(type), null, 4));
}
