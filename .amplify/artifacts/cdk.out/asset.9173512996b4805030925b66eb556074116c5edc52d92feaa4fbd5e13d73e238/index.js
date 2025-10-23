var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/@aws-amplify/platform-core/lib/backend_identifier_conversions.js
var require_backend_identifier_conversions = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/backend_identifier_conversions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BackendIdentifierConversions = void 0;
    var crypto_1 = require("crypto");
    var STACK_NAME_LENGTH_LIMIT = 128;
    var AMPLIFY_PREFIX = "amplify";
    var HASH_LENGTH = 10;
    var NUM_DASHES = 4;
    var BackendIdentifierConversions = class {
      /**
       * Convert a stack name to a BackendIdentifier
       *
       * If the stack name is ambiguous, undefined is returned
       */
      // It's fine to ignore the rule here because the anti-static rule is to ban the static function which should use constructor
      // eslint-disable-next-line no-restricted-syntax
      static fromStackName(stackName) {
        if (!stackName) {
          return;
        }
        const parts = stackName.split("-");
        if (parts.length !== 5) {
          return;
        }
        const [prefix, namespace, instance, type, hash] = parts;
        if (prefix !== AMPLIFY_PREFIX) {
          return;
        }
        if (type !== "sandbox" && type !== "branch") {
          return;
        }
        return {
          namespace,
          name: instance,
          type,
          hash
        };
      }
      /**
       * Convert a BackendIdentifier to a stack name.
       *
       * !!!DANGER!!!
       * !!!DO NOT CHANGE THIS UNLESS YOU ARE 100% SURE YOU UNDERSTAND THE CONSEQUENCES!!!
       *
       * Changing this method will change how stack names are generated which could be a massive breaking change for existing Amplify stacks.
       */
      // It's fine to ignore the rule here because the anti-static rule is to ban the static function which should use constructor
      // eslint-disable-next-line no-restricted-syntax
      static toStackName(backendId) {
        const hash = getHash(backendId);
        const name = sanitizeChars(backendId.name).slice(0, 50);
        const namespaceMaxLength = STACK_NAME_LENGTH_LIMIT - AMPLIFY_PREFIX.length - backendId.type.length - name.length - NUM_DASHES - HASH_LENGTH;
        const namespace = sanitizeChars(backendId.namespace).slice(0, namespaceMaxLength - 1);
        return ["amplify", namespace, name, backendId.type, hash].join("-");
      }
    };
    exports2.BackendIdentifierConversions = BackendIdentifierConversions;
    var getHash = (backendId) => backendId.hash ?? // md5 would be sufficient here because this hash does not need to be cryptographically secure, but this ensures that we don't get unnecessarily flagged by some security scanner
    (0, crypto_1.createHash)("sha512").update(backendId.namespace).update(backendId.name).digest("hex").slice(0, HASH_LENGTH);
    var sanitizeChars = (str) => {
      return str.replace(/[^A-Za-z0-9]/g, "");
    };
  }
});

// node_modules/@aws-amplify/platform-core/lib/errors/amplify_error.js
var require_amplify_error = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/errors/amplify_error.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AmplifyError = void 0;
    var _1 = require_errors();
    var AmplifyError = class _AmplifyError extends Error {
      name;
      classification;
      options;
      cause;
      serializedError;
      message;
      resolution;
      details;
      link;
      code;
      /**
       * You should use AmplifyUserError or AmplifyLibraryFault to throw an error.
       * @param name - a user friendly name for the exception
       * @param classification - LibraryFault or UserError
       * @param options - error stack, resolution steps, details, or help links
       * @param cause If you are throwing this exception from within a catch block,
       * you must provide the exception that was caught.
       * @example
       * try {
       *  ...
       * } catch (error){
       *    throw new AmplifyError(...,...,error);
       * }
       */
      constructor(name, classification, options, cause) {
        super(options.message, { cause });
        this.name = name;
        this.classification = classification;
        this.options = options;
        this.cause = cause;
        Object.setPrototypeOf(this, _AmplifyError.prototype);
        this.message = options.message;
        this.details = options.details;
        this.resolution = options.resolution;
        this.code = options.code;
        this.link = options.link;
        if (cause && _AmplifyError.isAmplifyError(cause)) {
          cause.serializedError = void 0;
        }
        this.serializedError = Buffer.from(JSON.stringify({
          name,
          classification,
          options,
          cause
        }, errorSerializer)).toString("base64");
      }
      static fromStderr = (_stderr) => {
        try {
          const serializedString = tryFindSerializedErrorJSONString(_stderr);
          if (!serializedString) {
            return void 0;
          }
          const { name, classification, options, cause } = JSON.parse(serializedString);
          let serializedCause = cause;
          if (cause && ErrorSerializerDeserializer.isSerializedErrorType(cause)) {
            serializedCause = ErrorSerializerDeserializer.deserialize(cause);
          }
          return classification === "ERROR" ? new _1.AmplifyUserError(name, options, serializedCause) : new _1.AmplifyFault(name, options, serializedCause);
        } catch {
          return void 0;
        }
      };
      /**
       * This function is a type predicate for AmplifyError.
       * See https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates.
       *
       * Checks if error is an AmplifyError by inspecting if required properties are set.
       * This is recommended instead of instanceof operator.
       * The instance of operator does not work as expected if AmplifyError class is loaded
       * from multiple sources, for example when package manager decides to not de-duplicate dependencies.
       * See https://github.com/nodejs/node/issues/17943.
       */
      static isAmplifyError = (error) => {
        return error instanceof Error && "classification" in error && (error.classification === "ERROR" || error.classification === "FAULT") && typeof error.name === "string" && typeof error.message === "string";
      };
      static fromError = (error) => {
        if (_AmplifyError.isAmplifyError(error)) {
          return error;
        }
        const errorMessage = error instanceof Error ? `${error.name}: ${error.message}` : "An unknown error happened. Check downstream error";
        if (error instanceof Error && isCredentialsError(error)) {
          return new _1.AmplifyUserError("CredentialsError", {
            message: errorMessage,
            resolution: "Ensure your AWS credentials are correctly set and refreshed."
          }, error);
        }
        if (error instanceof Error && isPermissionsError(error)) {
          return new _1.AmplifyUserError("AccessDeniedError", {
            message: errorMessage,
            resolution: "Ensure your IAM role has the AmplifyBackendDeployFullAccess policy along with any additional permissions required for this operation."
          }, error);
        }
        if (error instanceof Error && isRequestSignatureError(error)) {
          return new _1.AmplifyUserError("RequestSignatureError", {
            message: errorMessage,
            resolution: "You can retry your last request, check if your system time is synchronized (clock skew) or ensure your AWS credentials are correctly set and refreshed."
          }, error);
        }
        if (error instanceof Error && isYargsValidationError(error)) {
          return new _1.AmplifyUserError("InvalidCommandInputError", {
            message: errorMessage,
            resolution: "Please see the underlying error message for resolution."
          }, error);
        }
        if (error instanceof Error && isENotFoundError(error)) {
          return new _1.AmplifyUserError("DomainNotFoundError", {
            message: "Unable to establish a connection to a domain",
            resolution: "Ensure domain name is correct and network connection is stable."
          }, error);
        }
        if (error instanceof Error && isSyntaxError(error)) {
          return new _1.AmplifyUserError("SyntaxError", {
            message: error.message,
            resolution: "Check your backend definition in the `amplify` folder for syntax and type errors."
          }, error);
        }
        if (error instanceof Error && isInsufficientDiskSpaceError(error)) {
          return new _1.AmplifyUserError("InsufficientDiskSpaceError", {
            message: error.message,
            resolution: "There appears to be insufficient space on your system to finish. Clear up some disk space and try again."
          }, error);
        }
        if (error instanceof Error && isOutOfMemoryError(error)) {
          return new _1.AmplifyUserError("InsufficientMemorySpaceError", {
            message: error.message,
            resolution: "There appears to be insufficient memory on your system to finish. Close other applications or restart your system and try again."
          }, error);
        }
        if (error instanceof Error && isInotifyError(error)) {
          return new _1.AmplifyUserError("InsufficientInotifyWatchersError", {
            message: error.message,
            resolution: "There appears to be an insufficient number of inotify watchers. To increase the amount of inotify watchers, change the `fs.inotify.max_user_watches` setting in your system config files to a higher value."
          }, error);
        }
        return new _1.AmplifyFault("UnknownFault", {
          message: errorMessage
        }, error instanceof Error ? error : new Error(String(error)));
      };
    };
    exports2.AmplifyError = AmplifyError;
    var tryFindSerializedErrorJSONString = (_stderr) => {
      let errorJSONString = tryFindSerializedErrorJSONStringV2(_stderr);
      if (!errorJSONString) {
        errorJSONString = tryFindSerializedErrorJSONStringV1(_stderr);
      }
      return errorJSONString;
    };
    var tryFindSerializedErrorJSONStringV2 = (_stderr) => {
      const extractionRegex = /["']?serializedError["']?:[ ]?(?:`([a-zA-Z0-9+/=]+?)`|'([a-zA-Z0-9+/=]+?)'|"([a-zA-Z0-9+/=]+?)")/;
      const serialized = _stderr.match(extractionRegex);
      if (serialized && serialized.length === 4) {
        const base64SerializedString = serialized.slice(1).find((item) => item && item.length > 0);
        if (base64SerializedString) {
          return Buffer.from(base64SerializedString, "base64").toString("utf-8");
        }
      }
      return void 0;
    };
    var tryFindSerializedErrorJSONStringV1 = (_stderr) => {
      const extractionRegex = /["']?serializedError["']?:[ ]?(?:`(.+?)`|'(.+?)'|"((?:\\"|[^"])*?)")/;
      const serialized = _stderr.match(extractionRegex);
      if (serialized && serialized.length === 4) {
        return serialized.slice(1).find((item) => item && item.length > 0)?.replaceAll('\\"', '"').replaceAll("\\'", "'");
      }
      return void 0;
    };
    var isCredentialsError = (err) => {
      return !!err && [
        "ExpiredToken",
        "ExpiredTokenException",
        "CredentialsProviderError",
        "InvalidClientTokenId",
        "CredentialsError"
      ].includes(err.name);
    };
    var isPermissionsError = (err) => {
      return !!err && ["AccessDeniedException", "AccessDenied"].includes(err.name);
    };
    var isRequestSignatureError = (err) => {
      return !!err && ["InvalidSignatureException", "SignatureDoesNotMatch"].includes(err.name);
    };
    var isYargsValidationError = (err) => {
      return !!err && ([
        "Unknown command",
        "Unknown argument",
        "Did you mean",
        "Not enough non-option arguments",
        "Too many non-option arguments",
        "Missing required argument",
        "Invalid values:",
        "Missing dependent arguments",
        "Implications failed"
      ].some((message) => err.message.startsWith(message)) || err.message.endsWith("are mutually exclusive"));
    };
    var isENotFoundError = (err) => {
      return !!err && err.message.includes("getaddrinfo ENOTFOUND");
    };
    var isSyntaxError = (err) => {
      return !!err && err.name === "SyntaxError";
    };
    var isInsufficientDiskSpaceError = (err) => {
      return !!err && ["ENOSPC: no space left on device", "code ENOSPC"].some((message) => err.message.includes(message));
    };
    var isOutOfMemoryError = (err) => {
      return !!err && (err.message.includes("process out of memory") || err.message.includes("connect ENOMEM"));
    };
    var isInotifyError = (err) => {
      return !!err && err.message.includes("inotify_add_watch");
    };
    var errorSerializer = (_, value) => {
      if (value instanceof Error) {
        return ErrorSerializerDeserializer.serialize(value);
      }
      return value;
    };
    var ErrorSerializerDeserializer = class {
      static serialize = (error) => {
        const serializedError = {
          name: error.name,
          message: error.message
        };
        return serializedError;
      };
      static deserialize = (deserialized) => {
        const error = new Error(deserialized.message);
        error.name = deserialized.name;
        return error;
      };
      static isSerializedErrorType = (obj) => {
        if (obj && obj.name && obj.message)
          return true;
        return false;
      };
    };
  }
});

// node_modules/@aws-amplify/platform-core/lib/errors/amplify_user_error.js
var require_amplify_user_error = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/errors/amplify_user_error.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AmplifyUserError = void 0;
    var amplify_error_1 = require_amplify_error();
    var AmplifyUserError2 = class extends amplify_error_1.AmplifyError {
      /**
       * Create a new Amplify Error.
       * @param name - a user friendly name for the user error
       * @param options - error stack, resolution steps, details, or help links
       * @param cause If you are throwing this error from within a catch block,
       * you must provide the error that was caught.
       * @example
       * try {
       *  ...
       * } catch (error){
       *    throw new AmplifyError(...,...,error);
       * }
       */
      constructor(name, options, cause) {
        super(name, "ERROR", options, cause);
      }
    };
    exports2.AmplifyUserError = AmplifyUserError2;
  }
});

// node_modules/@aws-amplify/platform-core/lib/errors/amplify_library_fault.js
var require_amplify_library_fault = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/errors/amplify_library_fault.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AmplifyFault = void 0;
    var amplify_error_1 = require_amplify_error();
    var AmplifyFault2 = class extends amplify_error_1.AmplifyError {
      /**
       * Create a new Amplify Library Fault
       * @param name - a user friendly name for the exception
       * @param options - error stack, resolution steps, details, or help links
       * @param cause If you are throwing this exception from within a catch block,
       * you must provide the exception that was caught.
       * @example
       * try {
       *  ...
       * } catch (error){
       *    throw new AmplifyLibraryFault(error,...,...);
       * }
       */
      constructor(name, options, cause) {
        super(name, "FAULT", options, cause);
      }
    };
    exports2.AmplifyFault = AmplifyFault2;
  }
});

// node_modules/@aws-amplify/platform-core/lib/errors/index.js
var require_errors = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/errors/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    __exportStar(require_amplify_error(), exports2);
    __exportStar(require_amplify_user_error(), exports2);
    __exportStar(require_amplify_library_fault(), exports2);
  }
});

// node_modules/@aws-amplify/platform-core/lib/backend_entry_point_locator.js
var require_backend_entry_point_locator = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/backend_entry_point_locator.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BackendLocator = void 0;
    var fs_1 = __importDefault(require("fs"));
    var path_1 = __importDefault(require("path"));
    var errors_1 = require_errors();
    var BackendLocator = class {
      rootDir;
      relativePath = path_1.default.join("amplify", "backend");
      // Give preference to JS if that exists over TS in case customers have their own compilation process.
      supportedFileExtensions = [".js", ".mjs", ".cjs", ".ts"];
      /**
       * Constructor for BackendLocator
       */
      constructor(rootDir = process.cwd()) {
        this.rootDir = rootDir;
      }
      locate = () => {
        for (const fileExtension of this.supportedFileExtensions) {
          if (fs_1.default.existsSync(path_1.default.resolve(this.rootDir, this.relativePath + fileExtension))) {
            return this.relativePath + fileExtension;
          }
        }
        throw new errors_1.AmplifyUserError("FileConventionError", {
          message: `Amplify Backend not found in ${this.rootDir}.`,
          resolution: "Amplify Backend must be defined in amplify/backend.(ts|js|cjs|mjs)"
        });
      };
    };
    exports2.BackendLocator = BackendLocator;
  }
});

// node_modules/@aws-amplify/platform-core/lib/extract_file_path_from_stack_trace_line.js
var require_extract_file_path_from_stack_trace_line = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/extract_file_path_from_stack_trace_line.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FilePathExtractor = void 0;
    var node_url_1 = require("node:url");
    var extractFilePathFromStackTraceLineRegexes = [
      /\((?<filepath>(\w:)?[^:]*)[:\d]*\)/,
      /at (?<filepath>.*\.\w[^:\d]*)[:\d]*/
    ];
    var FilePathExtractor = class {
      stackTraceLine;
      /**
       * Constructor for FilePathExtractor
       */
      constructor(stackTraceLine) {
        this.stackTraceLine = stackTraceLine;
      }
      extract = () => {
        for (const regex of extractFilePathFromStackTraceLineRegexes) {
          const match = this.stackTraceLine.match(regex);
          if (match?.groups?.filepath) {
            return this.standardizePath(match?.groups?.filepath);
          }
        }
        return void 0;
      };
      // The input can be either a file path or a file URL. If it's a file URL, convert it to the path.
      standardizePath = (maybeUrl) => {
        try {
          const url = new URL(maybeUrl);
          if (url.protocol === "file:") {
            return (0, node_url_1.fileURLToPath)(url);
          }
          return maybeUrl;
        } catch {
          return maybeUrl;
        }
      };
    };
    exports2.FilePathExtractor = FilePathExtractor;
  }
});

// node_modules/@aws-amplify/platform-core/lib/caller_directory_extractor.js
var require_caller_directory_extractor = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/caller_directory_extractor.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CallerDirectoryExtractor = void 0;
    var path_1 = __importDefault(require("path"));
    var os = __importStar(require("os"));
    var extract_file_path_from_stack_trace_line_1 = require_extract_file_path_from_stack_trace_line();
    var CallerDirectoryExtractor = class {
      stackTrace;
      /**
       * Creates caller directory extractor.
       */
      constructor(stackTrace) {
        this.stackTrace = stackTrace;
      }
      extract = () => {
        let stackTrace = this.stackTrace;
        const unresolvedImportLocationError = new Error("Could not determine import path to construct absolute code path from relative path. Consider using an absolute path instead.");
        if (!stackTrace) {
          throw unresolvedImportLocationError;
        }
        stackTrace = stackTrace.replaceAll(os.EOL, "\n");
        const stacktraceLines = stackTrace.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("at")) || [];
        if (stacktraceLines.length < 2) {
          throw unresolvedImportLocationError;
        }
        const stackTraceImportLine = stacktraceLines[1];
        const filePath = new extract_file_path_from_stack_trace_line_1.FilePathExtractor(stackTraceImportLine).extract();
        if (filePath) {
          return path_1.default.dirname(filePath);
        }
        throw unresolvedImportLocationError;
      };
    };
    exports2.CallerDirectoryExtractor = CallerDirectoryExtractor;
  }
});

// node_modules/zod/dist/cjs/v3/helpers/util.js
var require_util = __commonJS({
  "node_modules/zod/dist/cjs/v3/helpers/util.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getParsedType = exports2.ZodParsedType = exports2.objectUtil = exports2.util = void 0;
    var util;
    (function(util2) {
      util2.assertEqual = (_) => {
      };
      function assertIs(_arg) {
      }
      util2.assertIs = assertIs;
      function assertNever(_x) {
        throw new Error();
      }
      util2.assertNever = assertNever;
      util2.arrayToEnum = (items) => {
        const obj = {};
        for (const item of items) {
          obj[item] = item;
        }
        return obj;
      };
      util2.getValidEnumValues = (obj) => {
        const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
        const filtered = {};
        for (const k of validKeys) {
          filtered[k] = obj[k];
        }
        return util2.objectValues(filtered);
      };
      util2.objectValues = (obj) => {
        return util2.objectKeys(obj).map(function(e) {
          return obj[e];
        });
      };
      util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
        const keys = [];
        for (const key in object) {
          if (Object.prototype.hasOwnProperty.call(object, key)) {
            keys.push(key);
          }
        }
        return keys;
      };
      util2.find = (arr, checker) => {
        for (const item of arr) {
          if (checker(item))
            return item;
        }
        return void 0;
      };
      util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
      function joinValues(array, separator = " | ") {
        return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
      }
      util2.joinValues = joinValues;
      util2.jsonStringifyReplacer = (_, value) => {
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      };
    })(util || (exports2.util = util = {}));
    var objectUtil;
    (function(objectUtil2) {
      objectUtil2.mergeShapes = (first, second) => {
        return {
          ...first,
          ...second
          // second overwrites first
        };
      };
    })(objectUtil || (exports2.objectUtil = objectUtil = {}));
    exports2.ZodParsedType = util.arrayToEnum([
      "string",
      "nan",
      "number",
      "integer",
      "float",
      "boolean",
      "date",
      "bigint",
      "symbol",
      "function",
      "undefined",
      "null",
      "array",
      "object",
      "unknown",
      "promise",
      "void",
      "never",
      "map",
      "set"
    ]);
    var getParsedType = (data) => {
      const t = typeof data;
      switch (t) {
        case "undefined":
          return exports2.ZodParsedType.undefined;
        case "string":
          return exports2.ZodParsedType.string;
        case "number":
          return Number.isNaN(data) ? exports2.ZodParsedType.nan : exports2.ZodParsedType.number;
        case "boolean":
          return exports2.ZodParsedType.boolean;
        case "function":
          return exports2.ZodParsedType.function;
        case "bigint":
          return exports2.ZodParsedType.bigint;
        case "symbol":
          return exports2.ZodParsedType.symbol;
        case "object":
          if (Array.isArray(data)) {
            return exports2.ZodParsedType.array;
          }
          if (data === null) {
            return exports2.ZodParsedType.null;
          }
          if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
            return exports2.ZodParsedType.promise;
          }
          if (typeof Map !== "undefined" && data instanceof Map) {
            return exports2.ZodParsedType.map;
          }
          if (typeof Set !== "undefined" && data instanceof Set) {
            return exports2.ZodParsedType.set;
          }
          if (typeof Date !== "undefined" && data instanceof Date) {
            return exports2.ZodParsedType.date;
          }
          return exports2.ZodParsedType.object;
        default:
          return exports2.ZodParsedType.unknown;
      }
    };
    exports2.getParsedType = getParsedType;
  }
});

// node_modules/zod/dist/cjs/v3/ZodError.js
var require_ZodError = __commonJS({
  "node_modules/zod/dist/cjs/v3/ZodError.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ZodError = exports2.quotelessJson = exports2.ZodIssueCode = void 0;
    var util_js_1 = require_util();
    exports2.ZodIssueCode = util_js_1.util.arrayToEnum([
      "invalid_type",
      "invalid_literal",
      "custom",
      "invalid_union",
      "invalid_union_discriminator",
      "invalid_enum_value",
      "unrecognized_keys",
      "invalid_arguments",
      "invalid_return_type",
      "invalid_date",
      "invalid_string",
      "too_small",
      "too_big",
      "invalid_intersection_types",
      "not_multiple_of",
      "not_finite"
    ]);
    var quotelessJson = (obj) => {
      const json = JSON.stringify(obj, null, 2);
      return json.replace(/"([^"]+)":/g, "$1:");
    };
    exports2.quotelessJson = quotelessJson;
    var ZodError = class _ZodError extends Error {
      get errors() {
        return this.issues;
      }
      constructor(issues) {
        super();
        this.issues = [];
        this.addIssue = (sub) => {
          this.issues = [...this.issues, sub];
        };
        this.addIssues = (subs = []) => {
          this.issues = [...this.issues, ...subs];
        };
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
          Object.setPrototypeOf(this, actualProto);
        } else {
          this.__proto__ = actualProto;
        }
        this.name = "ZodError";
        this.issues = issues;
      }
      format(_mapper) {
        const mapper = _mapper || function(issue) {
          return issue.message;
        };
        const fieldErrors = { _errors: [] };
        const processError = (error) => {
          for (const issue of error.issues) {
            if (issue.code === "invalid_union") {
              issue.unionErrors.map(processError);
            } else if (issue.code === "invalid_return_type") {
              processError(issue.returnTypeError);
            } else if (issue.code === "invalid_arguments") {
              processError(issue.argumentsError);
            } else if (issue.path.length === 0) {
              fieldErrors._errors.push(mapper(issue));
            } else {
              let curr = fieldErrors;
              let i = 0;
              while (i < issue.path.length) {
                const el = issue.path[i];
                const terminal = i === issue.path.length - 1;
                if (!terminal) {
                  curr[el] = curr[el] || { _errors: [] };
                } else {
                  curr[el] = curr[el] || { _errors: [] };
                  curr[el]._errors.push(mapper(issue));
                }
                curr = curr[el];
                i++;
              }
            }
          }
        };
        processError(this);
        return fieldErrors;
      }
      static assert(value) {
        if (!(value instanceof _ZodError)) {
          throw new Error(`Not a ZodError: ${value}`);
        }
      }
      toString() {
        return this.message;
      }
      get message() {
        return JSON.stringify(this.issues, util_js_1.util.jsonStringifyReplacer, 2);
      }
      get isEmpty() {
        return this.issues.length === 0;
      }
      flatten(mapper = (issue) => issue.message) {
        const fieldErrors = {};
        const formErrors = [];
        for (const sub of this.issues) {
          if (sub.path.length > 0) {
            fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
            fieldErrors[sub.path[0]].push(mapper(sub));
          } else {
            formErrors.push(mapper(sub));
          }
        }
        return { formErrors, fieldErrors };
      }
      get formErrors() {
        return this.flatten();
      }
    };
    exports2.ZodError = ZodError;
    ZodError.create = (issues) => {
      const error = new ZodError(issues);
      return error;
    };
  }
});

// node_modules/zod/dist/cjs/v3/locales/en.js
var require_en = __commonJS({
  "node_modules/zod/dist/cjs/v3/locales/en.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var ZodError_js_1 = require_ZodError();
    var util_js_1 = require_util();
    var errorMap = (issue, _ctx) => {
      let message;
      switch (issue.code) {
        case ZodError_js_1.ZodIssueCode.invalid_type:
          if (issue.received === util_js_1.ZodParsedType.undefined) {
            message = "Required";
          } else {
            message = `Expected ${issue.expected}, received ${issue.received}`;
          }
          break;
        case ZodError_js_1.ZodIssueCode.invalid_literal:
          message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util_js_1.util.jsonStringifyReplacer)}`;
          break;
        case ZodError_js_1.ZodIssueCode.unrecognized_keys:
          message = `Unrecognized key(s) in object: ${util_js_1.util.joinValues(issue.keys, ", ")}`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_union:
          message = `Invalid input`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_union_discriminator:
          message = `Invalid discriminator value. Expected ${util_js_1.util.joinValues(issue.options)}`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_enum_value:
          message = `Invalid enum value. Expected ${util_js_1.util.joinValues(issue.options)}, received '${issue.received}'`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_arguments:
          message = `Invalid function arguments`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_return_type:
          message = `Invalid function return type`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_date:
          message = `Invalid date`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_string:
          if (typeof issue.validation === "object") {
            if ("includes" in issue.validation) {
              message = `Invalid input: must include "${issue.validation.includes}"`;
              if (typeof issue.validation.position === "number") {
                message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
              }
            } else if ("startsWith" in issue.validation) {
              message = `Invalid input: must start with "${issue.validation.startsWith}"`;
            } else if ("endsWith" in issue.validation) {
              message = `Invalid input: must end with "${issue.validation.endsWith}"`;
            } else {
              util_js_1.util.assertNever(issue.validation);
            }
          } else if (issue.validation !== "regex") {
            message = `Invalid ${issue.validation}`;
          } else {
            message = "Invalid";
          }
          break;
        case ZodError_js_1.ZodIssueCode.too_small:
          if (issue.type === "array")
            message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
          else if (issue.type === "string")
            message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
          else if (issue.type === "number")
            message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
          else if (issue.type === "date")
            message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
          else
            message = "Invalid input";
          break;
        case ZodError_js_1.ZodIssueCode.too_big:
          if (issue.type === "array")
            message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
          else if (issue.type === "string")
            message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
          else if (issue.type === "number")
            message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
          else if (issue.type === "bigint")
            message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
          else if (issue.type === "date")
            message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
          else
            message = "Invalid input";
          break;
        case ZodError_js_1.ZodIssueCode.custom:
          message = `Invalid input`;
          break;
        case ZodError_js_1.ZodIssueCode.invalid_intersection_types:
          message = `Intersection results could not be merged`;
          break;
        case ZodError_js_1.ZodIssueCode.not_multiple_of:
          message = `Number must be a multiple of ${issue.multipleOf}`;
          break;
        case ZodError_js_1.ZodIssueCode.not_finite:
          message = "Number must be finite";
          break;
        default:
          message = _ctx.defaultError;
          util_js_1.util.assertNever(issue);
      }
      return { message };
    };
    exports2.default = errorMap;
  }
});

// node_modules/zod/dist/cjs/v3/errors.js
var require_errors2 = __commonJS({
  "node_modules/zod/dist/cjs/v3/errors.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultErrorMap = void 0;
    exports2.setErrorMap = setErrorMap;
    exports2.getErrorMap = getErrorMap;
    var en_js_1 = __importDefault(require_en());
    exports2.defaultErrorMap = en_js_1.default;
    var overrideErrorMap = en_js_1.default;
    function setErrorMap(map) {
      overrideErrorMap = map;
    }
    function getErrorMap() {
      return overrideErrorMap;
    }
  }
});

// node_modules/zod/dist/cjs/v3/helpers/parseUtil.js
var require_parseUtil = __commonJS({
  "node_modules/zod/dist/cjs/v3/helpers/parseUtil.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isAsync = exports2.isValid = exports2.isDirty = exports2.isAborted = exports2.OK = exports2.DIRTY = exports2.INVALID = exports2.ParseStatus = exports2.EMPTY_PATH = exports2.makeIssue = void 0;
    exports2.addIssueToContext = addIssueToContext;
    var errors_js_1 = require_errors2();
    var en_js_1 = __importDefault(require_en());
    var makeIssue = (params) => {
      const { data, path, errorMaps, issueData } = params;
      const fullPath = [...path, ...issueData.path || []];
      const fullIssue = {
        ...issueData,
        path: fullPath
      };
      if (issueData.message !== void 0) {
        return {
          ...issueData,
          path: fullPath,
          message: issueData.message
        };
      }
      let errorMessage = "";
      const maps = errorMaps.filter((m) => !!m).slice().reverse();
      for (const map of maps) {
        errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
      }
      return {
        ...issueData,
        path: fullPath,
        message: errorMessage
      };
    };
    exports2.makeIssue = makeIssue;
    exports2.EMPTY_PATH = [];
    function addIssueToContext(ctx, issueData) {
      const overrideMap = (0, errors_js_1.getErrorMap)();
      const issue = (0, exports2.makeIssue)({
        issueData,
        data: ctx.data,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          // contextual error map is first priority
          ctx.schemaErrorMap,
          // then schema-bound map if available
          overrideMap,
          // then global override map
          overrideMap === en_js_1.default ? void 0 : en_js_1.default
          // then global default map
        ].filter((x) => !!x)
      });
      ctx.common.issues.push(issue);
    }
    var ParseStatus = class _ParseStatus {
      constructor() {
        this.value = "valid";
      }
      dirty() {
        if (this.value === "valid")
          this.value = "dirty";
      }
      abort() {
        if (this.value !== "aborted")
          this.value = "aborted";
      }
      static mergeArray(status, results) {
        const arrayValue = [];
        for (const s of results) {
          if (s.status === "aborted")
            return exports2.INVALID;
          if (s.status === "dirty")
            status.dirty();
          arrayValue.push(s.value);
        }
        return { status: status.value, value: arrayValue };
      }
      static async mergeObjectAsync(status, pairs) {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value
          });
        }
        return _ParseStatus.mergeObjectSync(status, syncPairs);
      }
      static mergeObjectSync(status, pairs) {
        const finalObject = {};
        for (const pair of pairs) {
          const { key, value } = pair;
          if (key.status === "aborted")
            return exports2.INVALID;
          if (value.status === "aborted")
            return exports2.INVALID;
          if (key.status === "dirty")
            status.dirty();
          if (value.status === "dirty")
            status.dirty();
          if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
            finalObject[key.value] = value.value;
          }
        }
        return { status: status.value, value: finalObject };
      }
    };
    exports2.ParseStatus = ParseStatus;
    exports2.INVALID = Object.freeze({
      status: "aborted"
    });
    var DIRTY = (value) => ({ status: "dirty", value });
    exports2.DIRTY = DIRTY;
    var OK = (value) => ({ status: "valid", value });
    exports2.OK = OK;
    var isAborted = (x) => x.status === "aborted";
    exports2.isAborted = isAborted;
    var isDirty = (x) => x.status === "dirty";
    exports2.isDirty = isDirty;
    var isValid = (x) => x.status === "valid";
    exports2.isValid = isValid;
    var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
    exports2.isAsync = isAsync;
  }
});

// node_modules/zod/dist/cjs/v3/helpers/typeAliases.js
var require_typeAliases = __commonJS({
  "node_modules/zod/dist/cjs/v3/helpers/typeAliases.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/zod/dist/cjs/v3/helpers/errorUtil.js
var require_errorUtil = __commonJS({
  "node_modules/zod/dist/cjs/v3/helpers/errorUtil.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.errorUtil = void 0;
    var errorUtil;
    (function(errorUtil2) {
      errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
      errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
    })(errorUtil || (exports2.errorUtil = errorUtil = {}));
  }
});

// node_modules/zod/dist/cjs/v3/types.js
var require_types = __commonJS({
  "node_modules/zod/dist/cjs/v3/types.js"(exports2) {
    "use strict";
    var __classPrivateFieldGet = exports2 && exports2.__classPrivateFieldGet || function(receiver, state, kind, f) {
      if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
      return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };
    var __classPrivateFieldSet = exports2 && exports2.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
      if (kind === "m") throw new TypeError("Private method is not writable");
      if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
      return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
    };
    var _ZodEnum_cache;
    var _ZodNativeEnum_cache;
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.discriminatedUnion = exports2.date = exports2.boolean = exports2.bigint = exports2.array = exports2.any = exports2.coerce = exports2.ZodFirstPartyTypeKind = exports2.late = exports2.ZodSchema = exports2.Schema = exports2.ZodReadonly = exports2.ZodPipeline = exports2.ZodBranded = exports2.BRAND = exports2.ZodNaN = exports2.ZodCatch = exports2.ZodDefault = exports2.ZodNullable = exports2.ZodOptional = exports2.ZodTransformer = exports2.ZodEffects = exports2.ZodPromise = exports2.ZodNativeEnum = exports2.ZodEnum = exports2.ZodLiteral = exports2.ZodLazy = exports2.ZodFunction = exports2.ZodSet = exports2.ZodMap = exports2.ZodRecord = exports2.ZodTuple = exports2.ZodIntersection = exports2.ZodDiscriminatedUnion = exports2.ZodUnion = exports2.ZodObject = exports2.ZodArray = exports2.ZodVoid = exports2.ZodNever = exports2.ZodUnknown = exports2.ZodAny = exports2.ZodNull = exports2.ZodUndefined = exports2.ZodSymbol = exports2.ZodDate = exports2.ZodBoolean = exports2.ZodBigInt = exports2.ZodNumber = exports2.ZodString = exports2.ZodType = void 0;
    exports2.NEVER = exports2.void = exports2.unknown = exports2.union = exports2.undefined = exports2.tuple = exports2.transformer = exports2.symbol = exports2.string = exports2.strictObject = exports2.set = exports2.record = exports2.promise = exports2.preprocess = exports2.pipeline = exports2.ostring = exports2.optional = exports2.onumber = exports2.oboolean = exports2.object = exports2.number = exports2.nullable = exports2.null = exports2.never = exports2.nativeEnum = exports2.nan = exports2.map = exports2.literal = exports2.lazy = exports2.intersection = exports2.instanceof = exports2.function = exports2.enum = exports2.effect = void 0;
    exports2.datetimeRegex = datetimeRegex;
    exports2.custom = custom;
    var ZodError_js_1 = require_ZodError();
    var errors_js_1 = require_errors2();
    var errorUtil_js_1 = require_errorUtil();
    var parseUtil_js_1 = require_parseUtil();
    var util_js_1 = require_util();
    var ParseInputLazyPath = class {
      constructor(parent, value, path, key) {
        this._cachedPath = [];
        this.parent = parent;
        this.data = value;
        this._path = path;
        this._key = key;
      }
      get path() {
        if (!this._cachedPath.length) {
          if (Array.isArray(this._key)) {
            this._cachedPath.push(...this._path, ...this._key);
          } else {
            this._cachedPath.push(...this._path, this._key);
          }
        }
        return this._cachedPath;
      }
    };
    var handleResult = (ctx, result) => {
      if ((0, parseUtil_js_1.isValid)(result)) {
        return { success: true, data: result.value };
      } else {
        if (!ctx.common.issues.length) {
          throw new Error("Validation failed but no issues detected.");
        }
        return {
          success: false,
          get error() {
            if (this._error)
              return this._error;
            const error = new ZodError_js_1.ZodError(ctx.common.issues);
            this._error = error;
            return this._error;
          }
        };
      }
    };
    function processCreateParams(params) {
      if (!params)
        return {};
      const { errorMap, invalid_type_error, required_error, description } = params;
      if (errorMap && (invalid_type_error || required_error)) {
        throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
      }
      if (errorMap)
        return { errorMap, description };
      const customMap = (iss, ctx) => {
        const { message } = params;
        if (iss.code === "invalid_enum_value") {
          return { message: message ?? ctx.defaultError };
        }
        if (typeof ctx.data === "undefined") {
          return { message: message ?? required_error ?? ctx.defaultError };
        }
        if (iss.code !== "invalid_type")
          return { message: ctx.defaultError };
        return { message: message ?? invalid_type_error ?? ctx.defaultError };
      };
      return { errorMap: customMap, description };
    }
    var ZodType = class {
      get description() {
        return this._def.description;
      }
      _getType(input) {
        return (0, util_js_1.getParsedType)(input.data);
      }
      _getOrReturnCtx(input, ctx) {
        return ctx || {
          common: input.parent.common,
          data: input.data,
          parsedType: (0, util_js_1.getParsedType)(input.data),
          schemaErrorMap: this._def.errorMap,
          path: input.path,
          parent: input.parent
        };
      }
      _processInputParams(input) {
        return {
          status: new parseUtil_js_1.ParseStatus(),
          ctx: {
            common: input.parent.common,
            data: input.data,
            parsedType: (0, util_js_1.getParsedType)(input.data),
            schemaErrorMap: this._def.errorMap,
            path: input.path,
            parent: input.parent
          }
        };
      }
      _parseSync(input) {
        const result = this._parse(input);
        if ((0, parseUtil_js_1.isAsync)(result)) {
          throw new Error("Synchronous parse encountered promise.");
        }
        return result;
      }
      _parseAsync(input) {
        const result = this._parse(input);
        return Promise.resolve(result);
      }
      parse(data, params) {
        const result = this.safeParse(data, params);
        if (result.success)
          return result.data;
        throw result.error;
      }
      safeParse(data, params) {
        const ctx = {
          common: {
            issues: [],
            async: params?.async ?? false,
            contextualErrorMap: params?.errorMap
          },
          path: params?.path || [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: (0, util_js_1.getParsedType)(data)
        };
        const result = this._parseSync({ data, path: ctx.path, parent: ctx });
        return handleResult(ctx, result);
      }
      "~validate"(data) {
        const ctx = {
          common: {
            issues: [],
            async: !!this["~standard"].async
          },
          path: [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: (0, util_js_1.getParsedType)(data)
        };
        if (!this["~standard"].async) {
          try {
            const result = this._parseSync({ data, path: [], parent: ctx });
            return (0, parseUtil_js_1.isValid)(result) ? {
              value: result.value
            } : {
              issues: ctx.common.issues
            };
          } catch (err) {
            if (err?.message?.toLowerCase()?.includes("encountered")) {
              this["~standard"].async = true;
            }
            ctx.common = {
              issues: [],
              async: true
            };
          }
        }
        return this._parseAsync({ data, path: [], parent: ctx }).then((result) => (0, parseUtil_js_1.isValid)(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        });
      }
      async parseAsync(data, params) {
        const result = await this.safeParseAsync(data, params);
        if (result.success)
          return result.data;
        throw result.error;
      }
      async safeParseAsync(data, params) {
        const ctx = {
          common: {
            issues: [],
            contextualErrorMap: params?.errorMap,
            async: true
          },
          path: params?.path || [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: (0, util_js_1.getParsedType)(data)
        };
        const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
        const result = await ((0, parseUtil_js_1.isAsync)(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
        return handleResult(ctx, result);
      }
      refine(check, message) {
        const getIssueProperties = (val) => {
          if (typeof message === "string" || typeof message === "undefined") {
            return { message };
          } else if (typeof message === "function") {
            return message(val);
          } else {
            return message;
          }
        };
        return this._refinement((val, ctx) => {
          const result = check(val);
          const setError = () => ctx.addIssue({
            code: ZodError_js_1.ZodIssueCode.custom,
            ...getIssueProperties(val)
          });
          if (typeof Promise !== "undefined" && result instanceof Promise) {
            return result.then((data) => {
              if (!data) {
                setError();
                return false;
              } else {
                return true;
              }
            });
          }
          if (!result) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      refinement(check, refinementData) {
        return this._refinement((val, ctx) => {
          if (!check(val)) {
            ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
            return false;
          } else {
            return true;
          }
        });
      }
      _refinement(refinement) {
        return new ZodEffects({
          schema: this,
          typeName: ZodFirstPartyTypeKind.ZodEffects,
          effect: { type: "refinement", refinement }
        });
      }
      superRefine(refinement) {
        return this._refinement(refinement);
      }
      constructor(def) {
        this.spa = this.safeParseAsync;
        this._def = def;
        this.parse = this.parse.bind(this);
        this.safeParse = this.safeParse.bind(this);
        this.parseAsync = this.parseAsync.bind(this);
        this.safeParseAsync = this.safeParseAsync.bind(this);
        this.spa = this.spa.bind(this);
        this.refine = this.refine.bind(this);
        this.refinement = this.refinement.bind(this);
        this.superRefine = this.superRefine.bind(this);
        this.optional = this.optional.bind(this);
        this.nullable = this.nullable.bind(this);
        this.nullish = this.nullish.bind(this);
        this.array = this.array.bind(this);
        this.promise = this.promise.bind(this);
        this.or = this.or.bind(this);
        this.and = this.and.bind(this);
        this.transform = this.transform.bind(this);
        this.brand = this.brand.bind(this);
        this.default = this.default.bind(this);
        this.catch = this.catch.bind(this);
        this.describe = this.describe.bind(this);
        this.pipe = this.pipe.bind(this);
        this.readonly = this.readonly.bind(this);
        this.isNullable = this.isNullable.bind(this);
        this.isOptional = this.isOptional.bind(this);
        this["~standard"] = {
          version: 1,
          vendor: "zod",
          validate: (data) => this["~validate"](data)
        };
      }
      optional() {
        return ZodOptional.create(this, this._def);
      }
      nullable() {
        return ZodNullable.create(this, this._def);
      }
      nullish() {
        return this.nullable().optional();
      }
      array() {
        return ZodArray.create(this);
      }
      promise() {
        return ZodPromise.create(this, this._def);
      }
      or(option) {
        return ZodUnion.create([this, option], this._def);
      }
      and(incoming) {
        return ZodIntersection.create(this, incoming, this._def);
      }
      transform(transform) {
        return new ZodEffects({
          ...processCreateParams(this._def),
          schema: this,
          typeName: ZodFirstPartyTypeKind.ZodEffects,
          effect: { type: "transform", transform }
        });
      }
      default(def) {
        const defaultValueFunc = typeof def === "function" ? def : () => def;
        return new ZodDefault({
          ...processCreateParams(this._def),
          innerType: this,
          defaultValue: defaultValueFunc,
          typeName: ZodFirstPartyTypeKind.ZodDefault
        });
      }
      brand() {
        return new ZodBranded({
          typeName: ZodFirstPartyTypeKind.ZodBranded,
          type: this,
          ...processCreateParams(this._def)
        });
      }
      catch(def) {
        const catchValueFunc = typeof def === "function" ? def : () => def;
        return new ZodCatch({
          ...processCreateParams(this._def),
          innerType: this,
          catchValue: catchValueFunc,
          typeName: ZodFirstPartyTypeKind.ZodCatch
        });
      }
      describe(description) {
        const This = this.constructor;
        return new This({
          ...this._def,
          description
        });
      }
      pipe(target) {
        return ZodPipeline.create(this, target);
      }
      readonly() {
        return ZodReadonly.create(this);
      }
      isOptional() {
        return this.safeParse(void 0).success;
      }
      isNullable() {
        return this.safeParse(null).success;
      }
    };
    exports2.ZodType = ZodType;
    exports2.Schema = ZodType;
    exports2.ZodSchema = ZodType;
    var cuidRegex = /^c[^\s-]{8,}$/i;
    var cuid2Regex = /^[0-9a-z]+$/;
    var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
    var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
    var nanoidRegex = /^[a-z0-9_-]{21}$/i;
    var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
    var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
    var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
    var emojiRegex;
    var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
    var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
    var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
    var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
    var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
    var dateRegex = new RegExp(`^${dateRegexSource}$`);
    function timeRegexSource(args) {
      let secondsRegexSource = `[0-5]\\d`;
      if (args.precision) {
        secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
      } else if (args.precision == null) {
        secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
      }
      const secondsQuantifier = args.precision ? "+" : "?";
      return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
    }
    function timeRegex(args) {
      return new RegExp(`^${timeRegexSource(args)}$`);
    }
    function datetimeRegex(args) {
      let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
      const opts = [];
      opts.push(args.local ? `Z?` : `Z`);
      if (args.offset)
        opts.push(`([+-]\\d{2}:?\\d{2})`);
      regex = `${regex}(${opts.join("|")})`;
      return new RegExp(`^${regex}$`);
    }
    function isValidIP(ip, version) {
      if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
        return true;
      }
      if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
        return true;
      }
      return false;
    }
    function isValidJWT(jwt, alg) {
      if (!jwtRegex.test(jwt))
        return false;
      try {
        const [header] = jwt.split(".");
        const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
        const decoded = JSON.parse(atob(base64));
        if (typeof decoded !== "object" || decoded === null)
          return false;
        if ("typ" in decoded && decoded?.typ !== "JWT")
          return false;
        if (!decoded.alg)
          return false;
        if (alg && decoded.alg !== alg)
          return false;
        return true;
      } catch {
        return false;
      }
    }
    function isValidCidr(ip, version) {
      if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
        return true;
      }
      if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
        return true;
      }
      return false;
    }
    var ZodString = class _ZodString extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = String(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.string) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.string,
            received: ctx2.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const status = new parseUtil_js_1.ParseStatus();
        let ctx = void 0;
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            if (input.data.length < check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_small,
                minimum: check.value,
                type: "string",
                inclusive: true,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            if (input.data.length > check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_big,
                maximum: check.value,
                type: "string",
                inclusive: true,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "length") {
            const tooBig = input.data.length > check.value;
            const tooSmall = input.data.length < check.value;
            if (tooBig || tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              if (tooBig) {
                (0, parseUtil_js_1.addIssueToContext)(ctx, {
                  code: ZodError_js_1.ZodIssueCode.too_big,
                  maximum: check.value,
                  type: "string",
                  inclusive: true,
                  exact: true,
                  message: check.message
                });
              } else if (tooSmall) {
                (0, parseUtil_js_1.addIssueToContext)(ctx, {
                  code: ZodError_js_1.ZodIssueCode.too_small,
                  minimum: check.value,
                  type: "string",
                  inclusive: true,
                  exact: true,
                  message: check.message
                });
              }
              status.dirty();
            }
          } else if (check.kind === "email") {
            if (!emailRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "email",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "emoji") {
            if (!emojiRegex) {
              emojiRegex = new RegExp(_emojiRegex, "u");
            }
            if (!emojiRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "emoji",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "uuid") {
            if (!uuidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "uuid",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "nanoid") {
            if (!nanoidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "nanoid",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cuid") {
            if (!cuidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "cuid",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cuid2") {
            if (!cuid2Regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "cuid2",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "ulid") {
            if (!ulidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "ulid",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "url") {
            try {
              new URL(input.data);
            } catch {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "url",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "regex") {
            check.regex.lastIndex = 0;
            const testResult = check.regex.test(input.data);
            if (!testResult) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "regex",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "trim") {
            input.data = input.data.trim();
          } else if (check.kind === "includes") {
            if (!input.data.includes(check.value, check.position)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: { includes: check.value, position: check.position },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "toLowerCase") {
            input.data = input.data.toLowerCase();
          } else if (check.kind === "toUpperCase") {
            input.data = input.data.toUpperCase();
          } else if (check.kind === "startsWith") {
            if (!input.data.startsWith(check.value)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: { startsWith: check.value },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "endsWith") {
            if (!input.data.endsWith(check.value)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: { endsWith: check.value },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "datetime") {
            const regex = datetimeRegex(check);
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: "datetime",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "date") {
            const regex = dateRegex;
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: "date",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "time") {
            const regex = timeRegex(check);
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                validation: "time",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "duration") {
            if (!durationRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "duration",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "ip") {
            if (!isValidIP(input.data, check.version)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "ip",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "jwt") {
            if (!isValidJWT(input.data, check.alg)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "jwt",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cidr") {
            if (!isValidCidr(input.data, check.version)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "cidr",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "base64") {
            if (!base64Regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "base64",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "base64url") {
            if (!base64urlRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                validation: "base64url",
                code: ZodError_js_1.ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util_js_1.util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      _regex(regex, validation, message) {
        return this.refinement((data) => regex.test(data), {
          validation,
          code: ZodError_js_1.ZodIssueCode.invalid_string,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      _addCheck(check) {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      email(message) {
        return this._addCheck({ kind: "email", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      url(message) {
        return this._addCheck({ kind: "url", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      emoji(message) {
        return this._addCheck({ kind: "emoji", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      uuid(message) {
        return this._addCheck({ kind: "uuid", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      nanoid(message) {
        return this._addCheck({ kind: "nanoid", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      cuid(message) {
        return this._addCheck({ kind: "cuid", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      cuid2(message) {
        return this._addCheck({ kind: "cuid2", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      ulid(message) {
        return this._addCheck({ kind: "ulid", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      base64(message) {
        return this._addCheck({ kind: "base64", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      base64url(message) {
        return this._addCheck({
          kind: "base64url",
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      jwt(options) {
        return this._addCheck({ kind: "jwt", ...errorUtil_js_1.errorUtil.errToObj(options) });
      }
      ip(options) {
        return this._addCheck({ kind: "ip", ...errorUtil_js_1.errorUtil.errToObj(options) });
      }
      cidr(options) {
        return this._addCheck({ kind: "cidr", ...errorUtil_js_1.errorUtil.errToObj(options) });
      }
      datetime(options) {
        if (typeof options === "string") {
          return this._addCheck({
            kind: "datetime",
            precision: null,
            offset: false,
            local: false,
            message: options
          });
        }
        return this._addCheck({
          kind: "datetime",
          precision: typeof options?.precision === "undefined" ? null : options?.precision,
          offset: options?.offset ?? false,
          local: options?.local ?? false,
          ...errorUtil_js_1.errorUtil.errToObj(options?.message)
        });
      }
      date(message) {
        return this._addCheck({ kind: "date", message });
      }
      time(options) {
        if (typeof options === "string") {
          return this._addCheck({
            kind: "time",
            precision: null,
            message: options
          });
        }
        return this._addCheck({
          kind: "time",
          precision: typeof options?.precision === "undefined" ? null : options?.precision,
          ...errorUtil_js_1.errorUtil.errToObj(options?.message)
        });
      }
      duration(message) {
        return this._addCheck({ kind: "duration", ...errorUtil_js_1.errorUtil.errToObj(message) });
      }
      regex(regex, message) {
        return this._addCheck({
          kind: "regex",
          regex,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      includes(value, options) {
        return this._addCheck({
          kind: "includes",
          value,
          position: options?.position,
          ...errorUtil_js_1.errorUtil.errToObj(options?.message)
        });
      }
      startsWith(value, message) {
        return this._addCheck({
          kind: "startsWith",
          value,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      endsWith(value, message) {
        return this._addCheck({
          kind: "endsWith",
          value,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      min(minLength, message) {
        return this._addCheck({
          kind: "min",
          value: minLength,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      max(maxLength, message) {
        return this._addCheck({
          kind: "max",
          value: maxLength,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      length(len, message) {
        return this._addCheck({
          kind: "length",
          value: len,
          ...errorUtil_js_1.errorUtil.errToObj(message)
        });
      }
      /**
       * Equivalent to `.min(1)`
       */
      nonempty(message) {
        return this.min(1, errorUtil_js_1.errorUtil.errToObj(message));
      }
      trim() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "trim" }]
        });
      }
      toLowerCase() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "toLowerCase" }]
        });
      }
      toUpperCase() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "toUpperCase" }]
        });
      }
      get isDatetime() {
        return !!this._def.checks.find((ch) => ch.kind === "datetime");
      }
      get isDate() {
        return !!this._def.checks.find((ch) => ch.kind === "date");
      }
      get isTime() {
        return !!this._def.checks.find((ch) => ch.kind === "time");
      }
      get isDuration() {
        return !!this._def.checks.find((ch) => ch.kind === "duration");
      }
      get isEmail() {
        return !!this._def.checks.find((ch) => ch.kind === "email");
      }
      get isURL() {
        return !!this._def.checks.find((ch) => ch.kind === "url");
      }
      get isEmoji() {
        return !!this._def.checks.find((ch) => ch.kind === "emoji");
      }
      get isUUID() {
        return !!this._def.checks.find((ch) => ch.kind === "uuid");
      }
      get isNANOID() {
        return !!this._def.checks.find((ch) => ch.kind === "nanoid");
      }
      get isCUID() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid");
      }
      get isCUID2() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid2");
      }
      get isULID() {
        return !!this._def.checks.find((ch) => ch.kind === "ulid");
      }
      get isIP() {
        return !!this._def.checks.find((ch) => ch.kind === "ip");
      }
      get isCIDR() {
        return !!this._def.checks.find((ch) => ch.kind === "cidr");
      }
      get isBase64() {
        return !!this._def.checks.find((ch) => ch.kind === "base64");
      }
      get isBase64url() {
        return !!this._def.checks.find((ch) => ch.kind === "base64url");
      }
      get minLength() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxLength() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
    };
    exports2.ZodString = ZodString;
    ZodString.create = (params) => {
      return new ZodString({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodString,
        coerce: params?.coerce ?? false,
        ...processCreateParams(params)
      });
    };
    function floatSafeRemainder(val, step) {
      const valDecCount = (val.toString().split(".")[1] || "").length;
      const stepDecCount = (step.toString().split(".")[1] || "").length;
      const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
      const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
      const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
      return valInt % stepInt / 10 ** decCount;
    }
    var ZodNumber = class _ZodNumber extends ZodType {
      constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
        this.step = this.multipleOf;
      }
      _parse(input) {
        if (this._def.coerce) {
          input.data = Number(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.number) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.number,
            received: ctx2.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        let ctx = void 0;
        const status = new parseUtil_js_1.ParseStatus();
        for (const check of this._def.checks) {
          if (check.kind === "int") {
            if (!util_js_1.util.isInteger(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.invalid_type,
                expected: "integer",
                received: "float",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "min") {
            const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
            if (tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_small,
                minimum: check.value,
                type: "number",
                inclusive: check.inclusive,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
            if (tooBig) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_big,
                maximum: check.value,
                type: "number",
                inclusive: check.inclusive,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "multipleOf") {
            if (floatSafeRemainder(input.data, check.value) !== 0) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.not_multiple_of,
                multipleOf: check.value,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "finite") {
            if (!Number.isFinite(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.not_finite,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util_js_1.util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      gte(value, message) {
        return this.setLimit("min", value, true, errorUtil_js_1.errorUtil.toString(message));
      }
      gt(value, message) {
        return this.setLimit("min", value, false, errorUtil_js_1.errorUtil.toString(message));
      }
      lte(value, message) {
        return this.setLimit("max", value, true, errorUtil_js_1.errorUtil.toString(message));
      }
      lt(value, message) {
        return this.setLimit("max", value, false, errorUtil_js_1.errorUtil.toString(message));
      }
      setLimit(kind, value, inclusive, message) {
        return new _ZodNumber({
          ...this._def,
          checks: [
            ...this._def.checks,
            {
              kind,
              value,
              inclusive,
              message: errorUtil_js_1.errorUtil.toString(message)
            }
          ]
        });
      }
      _addCheck(check) {
        return new _ZodNumber({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      int(message) {
        return this._addCheck({
          kind: "int",
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      positive(message) {
        return this._addCheck({
          kind: "min",
          value: 0,
          inclusive: false,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      negative(message) {
        return this._addCheck({
          kind: "max",
          value: 0,
          inclusive: false,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      nonpositive(message) {
        return this._addCheck({
          kind: "max",
          value: 0,
          inclusive: true,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      nonnegative(message) {
        return this._addCheck({
          kind: "min",
          value: 0,
          inclusive: true,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      multipleOf(value, message) {
        return this._addCheck({
          kind: "multipleOf",
          value,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      finite(message) {
        return this._addCheck({
          kind: "finite",
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      safe(message) {
        return this._addCheck({
          kind: "min",
          inclusive: true,
          value: Number.MIN_SAFE_INTEGER,
          message: errorUtil_js_1.errorUtil.toString(message)
        })._addCheck({
          kind: "max",
          inclusive: true,
          value: Number.MAX_SAFE_INTEGER,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
      get isInt() {
        return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util_js_1.util.isInteger(ch.value));
      }
      get isFinite() {
        let max = null;
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
            return true;
          } else if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          } else if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return Number.isFinite(min) && Number.isFinite(max);
      }
    };
    exports2.ZodNumber = ZodNumber;
    ZodNumber.create = (params) => {
      return new ZodNumber({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodNumber,
        coerce: params?.coerce || false,
        ...processCreateParams(params)
      });
    };
    var ZodBigInt = class _ZodBigInt extends ZodType {
      constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
      }
      _parse(input) {
        if (this._def.coerce) {
          try {
            input.data = BigInt(input.data);
          } catch {
            return this._getInvalidInput(input);
          }
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.bigint) {
          return this._getInvalidInput(input);
        }
        let ctx = void 0;
        const status = new parseUtil_js_1.ParseStatus();
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
            if (tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_small,
                type: "bigint",
                minimum: check.value,
                inclusive: check.inclusive,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
            if (tooBig) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_big,
                type: "bigint",
                maximum: check.value,
                inclusive: check.inclusive,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "multipleOf") {
            if (input.data % check.value !== BigInt(0)) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.not_multiple_of,
                multipleOf: check.value,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util_js_1.util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      _getInvalidInput(input) {
        const ctx = this._getOrReturnCtx(input);
        (0, parseUtil_js_1.addIssueToContext)(ctx, {
          code: ZodError_js_1.ZodIssueCode.invalid_type,
          expected: util_js_1.ZodParsedType.bigint,
          received: ctx.parsedType
        });
        return parseUtil_js_1.INVALID;
      }
      gte(value, message) {
        return this.setLimit("min", value, true, errorUtil_js_1.errorUtil.toString(message));
      }
      gt(value, message) {
        return this.setLimit("min", value, false, errorUtil_js_1.errorUtil.toString(message));
      }
      lte(value, message) {
        return this.setLimit("max", value, true, errorUtil_js_1.errorUtil.toString(message));
      }
      lt(value, message) {
        return this.setLimit("max", value, false, errorUtil_js_1.errorUtil.toString(message));
      }
      setLimit(kind, value, inclusive, message) {
        return new _ZodBigInt({
          ...this._def,
          checks: [
            ...this._def.checks,
            {
              kind,
              value,
              inclusive,
              message: errorUtil_js_1.errorUtil.toString(message)
            }
          ]
        });
      }
      _addCheck(check) {
        return new _ZodBigInt({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      positive(message) {
        return this._addCheck({
          kind: "min",
          value: BigInt(0),
          inclusive: false,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      negative(message) {
        return this._addCheck({
          kind: "max",
          value: BigInt(0),
          inclusive: false,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      nonpositive(message) {
        return this._addCheck({
          kind: "max",
          value: BigInt(0),
          inclusive: true,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      nonnegative(message) {
        return this._addCheck({
          kind: "min",
          value: BigInt(0),
          inclusive: true,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      multipleOf(value, message) {
        return this._addCheck({
          kind: "multipleOf",
          value,
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
    };
    exports2.ZodBigInt = ZodBigInt;
    ZodBigInt.create = (params) => {
      return new ZodBigInt({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodBigInt,
        coerce: params?.coerce ?? false,
        ...processCreateParams(params)
      });
    };
    var ZodBoolean = class extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = Boolean(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.boolean) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.boolean,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports2.ZodBoolean = ZodBoolean;
    ZodBoolean.create = (params) => {
      return new ZodBoolean({
        typeName: ZodFirstPartyTypeKind.ZodBoolean,
        coerce: params?.coerce || false,
        ...processCreateParams(params)
      });
    };
    var ZodDate = class _ZodDate extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = new Date(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.date) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.date,
            received: ctx2.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        if (Number.isNaN(input.data.getTime())) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_date
          });
          return parseUtil_js_1.INVALID;
        }
        const status = new parseUtil_js_1.ParseStatus();
        let ctx = void 0;
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            if (input.data.getTime() < check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_small,
                message: check.message,
                inclusive: true,
                exact: false,
                minimum: check.value,
                type: "date"
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            if (input.data.getTime() > check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.too_big,
                message: check.message,
                inclusive: true,
                exact: false,
                maximum: check.value,
                type: "date"
              });
              status.dirty();
            }
          } else {
            util_js_1.util.assertNever(check);
          }
        }
        return {
          status: status.value,
          value: new Date(input.data.getTime())
        };
      }
      _addCheck(check) {
        return new _ZodDate({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      min(minDate, message) {
        return this._addCheck({
          kind: "min",
          value: minDate.getTime(),
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      max(maxDate, message) {
        return this._addCheck({
          kind: "max",
          value: maxDate.getTime(),
          message: errorUtil_js_1.errorUtil.toString(message)
        });
      }
      get minDate() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min != null ? new Date(min) : null;
      }
      get maxDate() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max != null ? new Date(max) : null;
      }
    };
    exports2.ZodDate = ZodDate;
    ZodDate.create = (params) => {
      return new ZodDate({
        checks: [],
        coerce: params?.coerce || false,
        typeName: ZodFirstPartyTypeKind.ZodDate,
        ...processCreateParams(params)
      });
    };
    var ZodSymbol = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.symbol) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.symbol,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports2.ZodSymbol = ZodSymbol;
    ZodSymbol.create = (params) => {
      return new ZodSymbol({
        typeName: ZodFirstPartyTypeKind.ZodSymbol,
        ...processCreateParams(params)
      });
    };
    var ZodUndefined = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.undefined) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.undefined,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports2.ZodUndefined = ZodUndefined;
    ZodUndefined.create = (params) => {
      return new ZodUndefined({
        typeName: ZodFirstPartyTypeKind.ZodUndefined,
        ...processCreateParams(params)
      });
    };
    var ZodNull = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.null) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.null,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports2.ZodNull = ZodNull;
    ZodNull.create = (params) => {
      return new ZodNull({
        typeName: ZodFirstPartyTypeKind.ZodNull,
        ...processCreateParams(params)
      });
    };
    var ZodAny = class extends ZodType {
      constructor() {
        super(...arguments);
        this._any = true;
      }
      _parse(input) {
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports2.ZodAny = ZodAny;
    ZodAny.create = (params) => {
      return new ZodAny({
        typeName: ZodFirstPartyTypeKind.ZodAny,
        ...processCreateParams(params)
      });
    };
    var ZodUnknown = class extends ZodType {
      constructor() {
        super(...arguments);
        this._unknown = true;
      }
      _parse(input) {
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports2.ZodUnknown = ZodUnknown;
    ZodUnknown.create = (params) => {
      return new ZodUnknown({
        typeName: ZodFirstPartyTypeKind.ZodUnknown,
        ...processCreateParams(params)
      });
    };
    var ZodNever = class extends ZodType {
      _parse(input) {
        const ctx = this._getOrReturnCtx(input);
        (0, parseUtil_js_1.addIssueToContext)(ctx, {
          code: ZodError_js_1.ZodIssueCode.invalid_type,
          expected: util_js_1.ZodParsedType.never,
          received: ctx.parsedType
        });
        return parseUtil_js_1.INVALID;
      }
    };
    exports2.ZodNever = ZodNever;
    ZodNever.create = (params) => {
      return new ZodNever({
        typeName: ZodFirstPartyTypeKind.ZodNever,
        ...processCreateParams(params)
      });
    };
    var ZodVoid = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.undefined) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.void,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
    };
    exports2.ZodVoid = ZodVoid;
    ZodVoid.create = (params) => {
      return new ZodVoid({
        typeName: ZodFirstPartyTypeKind.ZodVoid,
        ...processCreateParams(params)
      });
    };
    var ZodArray = class _ZodArray extends ZodType {
      _parse(input) {
        const { ctx, status } = this._processInputParams(input);
        const def = this._def;
        if (ctx.parsedType !== util_js_1.ZodParsedType.array) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.array,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        if (def.exactLength !== null) {
          const tooBig = ctx.data.length > def.exactLength.value;
          const tooSmall = ctx.data.length < def.exactLength.value;
          if (tooBig || tooSmall) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: tooBig ? ZodError_js_1.ZodIssueCode.too_big : ZodError_js_1.ZodIssueCode.too_small,
              minimum: tooSmall ? def.exactLength.value : void 0,
              maximum: tooBig ? def.exactLength.value : void 0,
              type: "array",
              inclusive: true,
              exact: true,
              message: def.exactLength.message
            });
            status.dirty();
          }
        }
        if (def.minLength !== null) {
          if (ctx.data.length < def.minLength.value) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.too_small,
              minimum: def.minLength.value,
              type: "array",
              inclusive: true,
              exact: false,
              message: def.minLength.message
            });
            status.dirty();
          }
        }
        if (def.maxLength !== null) {
          if (ctx.data.length > def.maxLength.value) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.too_big,
              maximum: def.maxLength.value,
              type: "array",
              inclusive: true,
              exact: false,
              message: def.maxLength.message
            });
            status.dirty();
          }
        }
        if (ctx.common.async) {
          return Promise.all([...ctx.data].map((item, i) => {
            return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
          })).then((result2) => {
            return parseUtil_js_1.ParseStatus.mergeArray(status, result2);
          });
        }
        const result = [...ctx.data].map((item, i) => {
          return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        });
        return parseUtil_js_1.ParseStatus.mergeArray(status, result);
      }
      get element() {
        return this._def.type;
      }
      min(minLength, message) {
        return new _ZodArray({
          ...this._def,
          minLength: { value: minLength, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      max(maxLength, message) {
        return new _ZodArray({
          ...this._def,
          maxLength: { value: maxLength, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      length(len, message) {
        return new _ZodArray({
          ...this._def,
          exactLength: { value: len, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      nonempty(message) {
        return this.min(1, message);
      }
    };
    exports2.ZodArray = ZodArray;
    ZodArray.create = (schema, params) => {
      return new ZodArray({
        type: schema,
        minLength: null,
        maxLength: null,
        exactLength: null,
        typeName: ZodFirstPartyTypeKind.ZodArray,
        ...processCreateParams(params)
      });
    };
    function deepPartialify(schema) {
      if (schema instanceof ZodObject) {
        const newShape = {};
        for (const key in schema.shape) {
          const fieldSchema = schema.shape[key];
          newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
        }
        return new ZodObject({
          ...schema._def,
          shape: () => newShape
        });
      } else if (schema instanceof ZodArray) {
        return new ZodArray({
          ...schema._def,
          type: deepPartialify(schema.element)
        });
      } else if (schema instanceof ZodOptional) {
        return ZodOptional.create(deepPartialify(schema.unwrap()));
      } else if (schema instanceof ZodNullable) {
        return ZodNullable.create(deepPartialify(schema.unwrap()));
      } else if (schema instanceof ZodTuple) {
        return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
      } else {
        return schema;
      }
    }
    var ZodObject = class _ZodObject extends ZodType {
      constructor() {
        super(...arguments);
        this._cached = null;
        this.nonstrict = this.passthrough;
        this.augment = this.extend;
      }
      _getCached() {
        if (this._cached !== null)
          return this._cached;
        const shape = this._def.shape();
        const keys = util_js_1.util.objectKeys(shape);
        this._cached = { shape, keys };
        return this._cached;
      }
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.object) {
          const ctx2 = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx2, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.object,
            received: ctx2.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const { status, ctx } = this._processInputParams(input);
        const { shape, keys: shapeKeys } = this._getCached();
        const extraKeys = [];
        if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
          for (const key in ctx.data) {
            if (!shapeKeys.includes(key)) {
              extraKeys.push(key);
            }
          }
        }
        const pairs = [];
        for (const key of shapeKeys) {
          const keyValidator = shape[key];
          const value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
            alwaysSet: key in ctx.data
          });
        }
        if (this._def.catchall instanceof ZodNever) {
          const unknownKeys = this._def.unknownKeys;
          if (unknownKeys === "passthrough") {
            for (const key of extraKeys) {
              pairs.push({
                key: { status: "valid", value: key },
                value: { status: "valid", value: ctx.data[key] }
              });
            }
          } else if (unknownKeys === "strict") {
            if (extraKeys.length > 0) {
              (0, parseUtil_js_1.addIssueToContext)(ctx, {
                code: ZodError_js_1.ZodIssueCode.unrecognized_keys,
                keys: extraKeys
              });
              status.dirty();
            }
          } else if (unknownKeys === "strip") {
          } else {
            throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
          }
        } else {
          const catchall = this._def.catchall;
          for (const key of extraKeys) {
            const value = ctx.data[key];
            pairs.push({
              key: { status: "valid", value: key },
              value: catchall._parse(
                new ParseInputLazyPath(ctx, value, ctx.path, key)
                //, ctx.child(key), value, getParsedType(value)
              ),
              alwaysSet: key in ctx.data
            });
          }
        }
        if (ctx.common.async) {
          return Promise.resolve().then(async () => {
            const syncPairs = [];
            for (const pair of pairs) {
              const key = await pair.key;
              const value = await pair.value;
              syncPairs.push({
                key,
                value,
                alwaysSet: pair.alwaysSet
              });
            }
            return syncPairs;
          }).then((syncPairs) => {
            return parseUtil_js_1.ParseStatus.mergeObjectSync(status, syncPairs);
          });
        } else {
          return parseUtil_js_1.ParseStatus.mergeObjectSync(status, pairs);
        }
      }
      get shape() {
        return this._def.shape();
      }
      strict(message) {
        errorUtil_js_1.errorUtil.errToObj;
        return new _ZodObject({
          ...this._def,
          unknownKeys: "strict",
          ...message !== void 0 ? {
            errorMap: (issue, ctx) => {
              const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
              if (issue.code === "unrecognized_keys")
                return {
                  message: errorUtil_js_1.errorUtil.errToObj(message).message ?? defaultError
                };
              return {
                message: defaultError
              };
            }
          } : {}
        });
      }
      strip() {
        return new _ZodObject({
          ...this._def,
          unknownKeys: "strip"
        });
      }
      passthrough() {
        return new _ZodObject({
          ...this._def,
          unknownKeys: "passthrough"
        });
      }
      // const AugmentFactory =
      //   <Def extends ZodObjectDef>(def: Def) =>
      //   <Augmentation extends ZodRawShape>(
      //     augmentation: Augmentation
      //   ): ZodObject<
      //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
      //     Def["unknownKeys"],
      //     Def["catchall"]
      //   > => {
      //     return new ZodObject({
      //       ...def,
      //       shape: () => ({
      //         ...def.shape(),
      //         ...augmentation,
      //       }),
      //     }) as any;
      //   };
      extend(augmentation) {
        return new _ZodObject({
          ...this._def,
          shape: () => ({
            ...this._def.shape(),
            ...augmentation
          })
        });
      }
      /**
       * Prior to zod@1.0.12 there was a bug in the
       * inferred type of merged objects. Please
       * upgrade if you are experiencing issues.
       */
      merge(merging) {
        const merged = new _ZodObject({
          unknownKeys: merging._def.unknownKeys,
          catchall: merging._def.catchall,
          shape: () => ({
            ...this._def.shape(),
            ...merging._def.shape()
          }),
          typeName: ZodFirstPartyTypeKind.ZodObject
        });
        return merged;
      }
      // merge<
      //   Incoming extends AnyZodObject,
      //   Augmentation extends Incoming["shape"],
      //   NewOutput extends {
      //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
      //       ? Augmentation[k]["_output"]
      //       : k extends keyof Output
      //       ? Output[k]
      //       : never;
      //   },
      //   NewInput extends {
      //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
      //       ? Augmentation[k]["_input"]
      //       : k extends keyof Input
      //       ? Input[k]
      //       : never;
      //   }
      // >(
      //   merging: Incoming
      // ): ZodObject<
      //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
      //   Incoming["_def"]["unknownKeys"],
      //   Incoming["_def"]["catchall"],
      //   NewOutput,
      //   NewInput
      // > {
      //   const merged: any = new ZodObject({
      //     unknownKeys: merging._def.unknownKeys,
      //     catchall: merging._def.catchall,
      //     shape: () =>
      //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
      //     typeName: ZodFirstPartyTypeKind.ZodObject,
      //   }) as any;
      //   return merged;
      // }
      setKey(key, schema) {
        return this.augment({ [key]: schema });
      }
      // merge<Incoming extends AnyZodObject>(
      //   merging: Incoming
      // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
      // ZodObject<
      //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
      //   Incoming["_def"]["unknownKeys"],
      //   Incoming["_def"]["catchall"]
      // > {
      //   // const mergedShape = objectUtil.mergeShapes(
      //   //   this._def.shape(),
      //   //   merging._def.shape()
      //   // );
      //   const merged: any = new ZodObject({
      //     unknownKeys: merging._def.unknownKeys,
      //     catchall: merging._def.catchall,
      //     shape: () =>
      //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
      //     typeName: ZodFirstPartyTypeKind.ZodObject,
      //   }) as any;
      //   return merged;
      // }
      catchall(index) {
        return new _ZodObject({
          ...this._def,
          catchall: index
        });
      }
      pick(mask) {
        const shape = {};
        for (const key of util_js_1.util.objectKeys(mask)) {
          if (mask[key] && this.shape[key]) {
            shape[key] = this.shape[key];
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => shape
        });
      }
      omit(mask) {
        const shape = {};
        for (const key of util_js_1.util.objectKeys(this.shape)) {
          if (!mask[key]) {
            shape[key] = this.shape[key];
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => shape
        });
      }
      /**
       * @deprecated
       */
      deepPartial() {
        return deepPartialify(this);
      }
      partial(mask) {
        const newShape = {};
        for (const key of util_js_1.util.objectKeys(this.shape)) {
          const fieldSchema = this.shape[key];
          if (mask && !mask[key]) {
            newShape[key] = fieldSchema;
          } else {
            newShape[key] = fieldSchema.optional();
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => newShape
        });
      }
      required(mask) {
        const newShape = {};
        for (const key of util_js_1.util.objectKeys(this.shape)) {
          if (mask && !mask[key]) {
            newShape[key] = this.shape[key];
          } else {
            const fieldSchema = this.shape[key];
            let newField = fieldSchema;
            while (newField instanceof ZodOptional) {
              newField = newField._def.innerType;
            }
            newShape[key] = newField;
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => newShape
        });
      }
      keyof() {
        return createZodEnum(util_js_1.util.objectKeys(this.shape));
      }
    };
    exports2.ZodObject = ZodObject;
    ZodObject.create = (shape, params) => {
      return new ZodObject({
        shape: () => shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    ZodObject.strictCreate = (shape, params) => {
      return new ZodObject({
        shape: () => shape,
        unknownKeys: "strict",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    ZodObject.lazycreate = (shape, params) => {
      return new ZodObject({
        shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    var ZodUnion = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const options = this._def.options;
        function handleResults(results) {
          for (const result of results) {
            if (result.result.status === "valid") {
              return result.result;
            }
          }
          for (const result of results) {
            if (result.result.status === "dirty") {
              ctx.common.issues.push(...result.ctx.common.issues);
              return result.result;
            }
          }
          const unionErrors = results.map((result) => new ZodError_js_1.ZodError(result.ctx.common.issues));
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_union,
            unionErrors
          });
          return parseUtil_js_1.INVALID;
        }
        if (ctx.common.async) {
          return Promise.all(options.map(async (option) => {
            const childCtx = {
              ...ctx,
              common: {
                ...ctx.common,
                issues: []
              },
              parent: null
            };
            return {
              result: await option._parseAsync({
                data: ctx.data,
                path: ctx.path,
                parent: childCtx
              }),
              ctx: childCtx
            };
          })).then(handleResults);
        } else {
          let dirty = void 0;
          const issues = [];
          for (const option of options) {
            const childCtx = {
              ...ctx,
              common: {
                ...ctx.common,
                issues: []
              },
              parent: null
            };
            const result = option._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            });
            if (result.status === "valid") {
              return result;
            } else if (result.status === "dirty" && !dirty) {
              dirty = { result, ctx: childCtx };
            }
            if (childCtx.common.issues.length) {
              issues.push(childCtx.common.issues);
            }
          }
          if (dirty) {
            ctx.common.issues.push(...dirty.ctx.common.issues);
            return dirty.result;
          }
          const unionErrors = issues.map((issues2) => new ZodError_js_1.ZodError(issues2));
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_union,
            unionErrors
          });
          return parseUtil_js_1.INVALID;
        }
      }
      get options() {
        return this._def.options;
      }
    };
    exports2.ZodUnion = ZodUnion;
    ZodUnion.create = (types, params) => {
      return new ZodUnion({
        options: types,
        typeName: ZodFirstPartyTypeKind.ZodUnion,
        ...processCreateParams(params)
      });
    };
    var getDiscriminator = (type) => {
      if (type instanceof ZodLazy) {
        return getDiscriminator(type.schema);
      } else if (type instanceof ZodEffects) {
        return getDiscriminator(type.innerType());
      } else if (type instanceof ZodLiteral) {
        return [type.value];
      } else if (type instanceof ZodEnum) {
        return type.options;
      } else if (type instanceof ZodNativeEnum) {
        return util_js_1.util.objectValues(type.enum);
      } else if (type instanceof ZodDefault) {
        return getDiscriminator(type._def.innerType);
      } else if (type instanceof ZodUndefined) {
        return [void 0];
      } else if (type instanceof ZodNull) {
        return [null];
      } else if (type instanceof ZodOptional) {
        return [void 0, ...getDiscriminator(type.unwrap())];
      } else if (type instanceof ZodNullable) {
        return [null, ...getDiscriminator(type.unwrap())];
      } else if (type instanceof ZodBranded) {
        return getDiscriminator(type.unwrap());
      } else if (type instanceof ZodReadonly) {
        return getDiscriminator(type.unwrap());
      } else if (type instanceof ZodCatch) {
        return getDiscriminator(type._def.innerType);
      } else {
        return [];
      }
    };
    var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.object) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.object,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const discriminator = this.discriminator;
        const discriminatorValue = ctx.data[discriminator];
        const option = this.optionsMap.get(discriminatorValue);
        if (!option) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_union_discriminator,
            options: Array.from(this.optionsMap.keys()),
            path: [discriminator]
          });
          return parseUtil_js_1.INVALID;
        }
        if (ctx.common.async) {
          return option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
        } else {
          return option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
        }
      }
      get discriminator() {
        return this._def.discriminator;
      }
      get options() {
        return this._def.options;
      }
      get optionsMap() {
        return this._def.optionsMap;
      }
      /**
       * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
       * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
       * have a different value for each object in the union.
       * @param discriminator the name of the discriminator property
       * @param types an array of object schemas
       * @param params
       */
      static create(discriminator, options, params) {
        const optionsMap = /* @__PURE__ */ new Map();
        for (const type of options) {
          const discriminatorValues = getDiscriminator(type.shape[discriminator]);
          if (!discriminatorValues.length) {
            throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
          }
          for (const value of discriminatorValues) {
            if (optionsMap.has(value)) {
              throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
            }
            optionsMap.set(value, type);
          }
        }
        return new _ZodDiscriminatedUnion({
          typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
          discriminator,
          options,
          optionsMap,
          ...processCreateParams(params)
        });
      }
    };
    exports2.ZodDiscriminatedUnion = ZodDiscriminatedUnion;
    function mergeValues(a, b) {
      const aType = (0, util_js_1.getParsedType)(a);
      const bType = (0, util_js_1.getParsedType)(b);
      if (a === b) {
        return { valid: true, data: a };
      } else if (aType === util_js_1.ZodParsedType.object && bType === util_js_1.ZodParsedType.object) {
        const bKeys = util_js_1.util.objectKeys(b);
        const sharedKeys = util_js_1.util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
        const newObj = { ...a, ...b };
        for (const key of sharedKeys) {
          const sharedValue = mergeValues(a[key], b[key]);
          if (!sharedValue.valid) {
            return { valid: false };
          }
          newObj[key] = sharedValue.data;
        }
        return { valid: true, data: newObj };
      } else if (aType === util_js_1.ZodParsedType.array && bType === util_js_1.ZodParsedType.array) {
        if (a.length !== b.length) {
          return { valid: false };
        }
        const newArray = [];
        for (let index = 0; index < a.length; index++) {
          const itemA = a[index];
          const itemB = b[index];
          const sharedValue = mergeValues(itemA, itemB);
          if (!sharedValue.valid) {
            return { valid: false };
          }
          newArray.push(sharedValue.data);
        }
        return { valid: true, data: newArray };
      } else if (aType === util_js_1.ZodParsedType.date && bType === util_js_1.ZodParsedType.date && +a === +b) {
        return { valid: true, data: a };
      } else {
        return { valid: false };
      }
    }
    var ZodIntersection = class extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const handleParsed = (parsedLeft, parsedRight) => {
          if ((0, parseUtil_js_1.isAborted)(parsedLeft) || (0, parseUtil_js_1.isAborted)(parsedRight)) {
            return parseUtil_js_1.INVALID;
          }
          const merged = mergeValues(parsedLeft.value, parsedRight.value);
          if (!merged.valid) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.invalid_intersection_types
            });
            return parseUtil_js_1.INVALID;
          }
          if ((0, parseUtil_js_1.isDirty)(parsedLeft) || (0, parseUtil_js_1.isDirty)(parsedRight)) {
            status.dirty();
          }
          return { status: status.value, value: merged.data };
        };
        if (ctx.common.async) {
          return Promise.all([
            this._def.left._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            }),
            this._def.right._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            })
          ]).then(([left, right]) => handleParsed(left, right));
        } else {
          return handleParsed(this._def.left._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }), this._def.right._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }));
        }
      }
    };
    exports2.ZodIntersection = ZodIntersection;
    ZodIntersection.create = (left, right, params) => {
      return new ZodIntersection({
        left,
        right,
        typeName: ZodFirstPartyTypeKind.ZodIntersection,
        ...processCreateParams(params)
      });
    };
    var ZodTuple = class _ZodTuple extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.array) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.array,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        if (ctx.data.length < this._def.items.length) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.too_small,
            minimum: this._def.items.length,
            inclusive: true,
            exact: false,
            type: "array"
          });
          return parseUtil_js_1.INVALID;
        }
        const rest = this._def.rest;
        if (!rest && ctx.data.length > this._def.items.length) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.too_big,
            maximum: this._def.items.length,
            inclusive: true,
            exact: false,
            type: "array"
          });
          status.dirty();
        }
        const items = [...ctx.data].map((item, itemIndex) => {
          const schema = this._def.items[itemIndex] || this._def.rest;
          if (!schema)
            return null;
          return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
        }).filter((x) => !!x);
        if (ctx.common.async) {
          return Promise.all(items).then((results) => {
            return parseUtil_js_1.ParseStatus.mergeArray(status, results);
          });
        } else {
          return parseUtil_js_1.ParseStatus.mergeArray(status, items);
        }
      }
      get items() {
        return this._def.items;
      }
      rest(rest) {
        return new _ZodTuple({
          ...this._def,
          rest
        });
      }
    };
    exports2.ZodTuple = ZodTuple;
    ZodTuple.create = (schemas, params) => {
      if (!Array.isArray(schemas)) {
        throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
      }
      return new ZodTuple({
        items: schemas,
        typeName: ZodFirstPartyTypeKind.ZodTuple,
        rest: null,
        ...processCreateParams(params)
      });
    };
    var ZodRecord = class _ZodRecord extends ZodType {
      get keySchema() {
        return this._def.keyType;
      }
      get valueSchema() {
        return this._def.valueType;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.object) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.object,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const pairs = [];
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        for (const key in ctx.data) {
          pairs.push({
            key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
            value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
            alwaysSet: key in ctx.data
          });
        }
        if (ctx.common.async) {
          return parseUtil_js_1.ParseStatus.mergeObjectAsync(status, pairs);
        } else {
          return parseUtil_js_1.ParseStatus.mergeObjectSync(status, pairs);
        }
      }
      get element() {
        return this._def.valueType;
      }
      static create(first, second, third) {
        if (second instanceof ZodType) {
          return new _ZodRecord({
            keyType: first,
            valueType: second,
            typeName: ZodFirstPartyTypeKind.ZodRecord,
            ...processCreateParams(third)
          });
        }
        return new _ZodRecord({
          keyType: ZodString.create(),
          valueType: first,
          typeName: ZodFirstPartyTypeKind.ZodRecord,
          ...processCreateParams(second)
        });
      }
    };
    exports2.ZodRecord = ZodRecord;
    var ZodMap = class extends ZodType {
      get keySchema() {
        return this._def.keyType;
      }
      get valueSchema() {
        return this._def.valueType;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.map) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.map,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        const pairs = [...ctx.data.entries()].map(([key, value], index) => {
          return {
            key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
            value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
          };
        });
        if (ctx.common.async) {
          const finalMap = /* @__PURE__ */ new Map();
          return Promise.resolve().then(async () => {
            for (const pair of pairs) {
              const key = await pair.key;
              const value = await pair.value;
              if (key.status === "aborted" || value.status === "aborted") {
                return parseUtil_js_1.INVALID;
              }
              if (key.status === "dirty" || value.status === "dirty") {
                status.dirty();
              }
              finalMap.set(key.value, value.value);
            }
            return { status: status.value, value: finalMap };
          });
        } else {
          const finalMap = /* @__PURE__ */ new Map();
          for (const pair of pairs) {
            const key = pair.key;
            const value = pair.value;
            if (key.status === "aborted" || value.status === "aborted") {
              return parseUtil_js_1.INVALID;
            }
            if (key.status === "dirty" || value.status === "dirty") {
              status.dirty();
            }
            finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        }
      }
    };
    exports2.ZodMap = ZodMap;
    ZodMap.create = (keyType, valueType, params) => {
      return new ZodMap({
        valueType,
        keyType,
        typeName: ZodFirstPartyTypeKind.ZodMap,
        ...processCreateParams(params)
      });
    };
    var ZodSet = class _ZodSet extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.set) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.set,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const def = this._def;
        if (def.minSize !== null) {
          if (ctx.data.size < def.minSize.value) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.too_small,
              minimum: def.minSize.value,
              type: "set",
              inclusive: true,
              exact: false,
              message: def.minSize.message
            });
            status.dirty();
          }
        }
        if (def.maxSize !== null) {
          if (ctx.data.size > def.maxSize.value) {
            (0, parseUtil_js_1.addIssueToContext)(ctx, {
              code: ZodError_js_1.ZodIssueCode.too_big,
              maximum: def.maxSize.value,
              type: "set",
              inclusive: true,
              exact: false,
              message: def.maxSize.message
            });
            status.dirty();
          }
        }
        const valueType = this._def.valueType;
        function finalizeSet(elements2) {
          const parsedSet = /* @__PURE__ */ new Set();
          for (const element of elements2) {
            if (element.status === "aborted")
              return parseUtil_js_1.INVALID;
            if (element.status === "dirty")
              status.dirty();
            parsedSet.add(element.value);
          }
          return { status: status.value, value: parsedSet };
        }
        const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
        if (ctx.common.async) {
          return Promise.all(elements).then((elements2) => finalizeSet(elements2));
        } else {
          return finalizeSet(elements);
        }
      }
      min(minSize, message) {
        return new _ZodSet({
          ...this._def,
          minSize: { value: minSize, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      max(maxSize, message) {
        return new _ZodSet({
          ...this._def,
          maxSize: { value: maxSize, message: errorUtil_js_1.errorUtil.toString(message) }
        });
      }
      size(size, message) {
        return this.min(size, message).max(size, message);
      }
      nonempty(message) {
        return this.min(1, message);
      }
    };
    exports2.ZodSet = ZodSet;
    ZodSet.create = (valueType, params) => {
      return new ZodSet({
        valueType,
        minSize: null,
        maxSize: null,
        typeName: ZodFirstPartyTypeKind.ZodSet,
        ...processCreateParams(params)
      });
    };
    var ZodFunction = class _ZodFunction extends ZodType {
      constructor() {
        super(...arguments);
        this.validate = this.implement;
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.function) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.function,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        function makeArgsIssue(args, error) {
          return (0, parseUtil_js_1.makeIssue)({
            data: args,
            path: ctx.path,
            errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, (0, errors_js_1.getErrorMap)(), errors_js_1.defaultErrorMap].filter((x) => !!x),
            issueData: {
              code: ZodError_js_1.ZodIssueCode.invalid_arguments,
              argumentsError: error
            }
          });
        }
        function makeReturnsIssue(returns, error) {
          return (0, parseUtil_js_1.makeIssue)({
            data: returns,
            path: ctx.path,
            errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, (0, errors_js_1.getErrorMap)(), errors_js_1.defaultErrorMap].filter((x) => !!x),
            issueData: {
              code: ZodError_js_1.ZodIssueCode.invalid_return_type,
              returnTypeError: error
            }
          });
        }
        const params = { errorMap: ctx.common.contextualErrorMap };
        const fn = ctx.data;
        if (this._def.returns instanceof ZodPromise) {
          const me = this;
          return (0, parseUtil_js_1.OK)(async function(...args) {
            const error = new ZodError_js_1.ZodError([]);
            const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
              error.addIssue(makeArgsIssue(args, e));
              throw error;
            });
            const result = await Reflect.apply(fn, this, parsedArgs);
            const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
              error.addIssue(makeReturnsIssue(result, e));
              throw error;
            });
            return parsedReturns;
          });
        } else {
          const me = this;
          return (0, parseUtil_js_1.OK)(function(...args) {
            const parsedArgs = me._def.args.safeParse(args, params);
            if (!parsedArgs.success) {
              throw new ZodError_js_1.ZodError([makeArgsIssue(args, parsedArgs.error)]);
            }
            const result = Reflect.apply(fn, this, parsedArgs.data);
            const parsedReturns = me._def.returns.safeParse(result, params);
            if (!parsedReturns.success) {
              throw new ZodError_js_1.ZodError([makeReturnsIssue(result, parsedReturns.error)]);
            }
            return parsedReturns.data;
          });
        }
      }
      parameters() {
        return this._def.args;
      }
      returnType() {
        return this._def.returns;
      }
      args(...items) {
        return new _ZodFunction({
          ...this._def,
          args: ZodTuple.create(items).rest(ZodUnknown.create())
        });
      }
      returns(returnType) {
        return new _ZodFunction({
          ...this._def,
          returns: returnType
        });
      }
      implement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
      }
      strictImplement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
      }
      static create(args, returns, params) {
        return new _ZodFunction({
          args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
          returns: returns || ZodUnknown.create(),
          typeName: ZodFirstPartyTypeKind.ZodFunction,
          ...processCreateParams(params)
        });
      }
    };
    exports2.ZodFunction = ZodFunction;
    var ZodLazy = class extends ZodType {
      get schema() {
        return this._def.getter();
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const lazySchema = this._def.getter();
        return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
      }
    };
    exports2.ZodLazy = ZodLazy;
    ZodLazy.create = (getter, params) => {
      return new ZodLazy({
        getter,
        typeName: ZodFirstPartyTypeKind.ZodLazy,
        ...processCreateParams(params)
      });
    };
    var ZodLiteral = class extends ZodType {
      _parse(input) {
        if (input.data !== this._def.value) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            received: ctx.data,
            code: ZodError_js_1.ZodIssueCode.invalid_literal,
            expected: this._def.value
          });
          return parseUtil_js_1.INVALID;
        }
        return { status: "valid", value: input.data };
      }
      get value() {
        return this._def.value;
      }
    };
    exports2.ZodLiteral = ZodLiteral;
    ZodLiteral.create = (value, params) => {
      return new ZodLiteral({
        value,
        typeName: ZodFirstPartyTypeKind.ZodLiteral,
        ...processCreateParams(params)
      });
    };
    function createZodEnum(values, params) {
      return new ZodEnum({
        values,
        typeName: ZodFirstPartyTypeKind.ZodEnum,
        ...processCreateParams(params)
      });
    }
    var ZodEnum = class _ZodEnum extends ZodType {
      constructor() {
        super(...arguments);
        _ZodEnum_cache.set(this, void 0);
      }
      _parse(input) {
        if (typeof input.data !== "string") {
          const ctx = this._getOrReturnCtx(input);
          const expectedValues = this._def.values;
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            expected: util_js_1.util.joinValues(expectedValues),
            received: ctx.parsedType,
            code: ZodError_js_1.ZodIssueCode.invalid_type
          });
          return parseUtil_js_1.INVALID;
        }
        if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f")) {
          __classPrivateFieldSet(this, _ZodEnum_cache, new Set(this._def.values), "f");
        }
        if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f").has(input.data)) {
          const ctx = this._getOrReturnCtx(input);
          const expectedValues = this._def.values;
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            received: ctx.data,
            code: ZodError_js_1.ZodIssueCode.invalid_enum_value,
            options: expectedValues
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
      get options() {
        return this._def.values;
      }
      get enum() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      get Values() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      get Enum() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      extract(values, newDef = this._def) {
        return _ZodEnum.create(values, {
          ...this._def,
          ...newDef
        });
      }
      exclude(values, newDef = this._def) {
        return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
          ...this._def,
          ...newDef
        });
      }
    };
    exports2.ZodEnum = ZodEnum;
    _ZodEnum_cache = /* @__PURE__ */ new WeakMap();
    ZodEnum.create = createZodEnum;
    var ZodNativeEnum = class extends ZodType {
      constructor() {
        super(...arguments);
        _ZodNativeEnum_cache.set(this, void 0);
      }
      _parse(input) {
        const nativeEnumValues = util_js_1.util.getValidEnumValues(this._def.values);
        const ctx = this._getOrReturnCtx(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.string && ctx.parsedType !== util_js_1.ZodParsedType.number) {
          const expectedValues = util_js_1.util.objectValues(nativeEnumValues);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            expected: util_js_1.util.joinValues(expectedValues),
            received: ctx.parsedType,
            code: ZodError_js_1.ZodIssueCode.invalid_type
          });
          return parseUtil_js_1.INVALID;
        }
        if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f")) {
          __classPrivateFieldSet(this, _ZodNativeEnum_cache, new Set(util_js_1.util.getValidEnumValues(this._def.values)), "f");
        }
        if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f").has(input.data)) {
          const expectedValues = util_js_1.util.objectValues(nativeEnumValues);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            received: ctx.data,
            code: ZodError_js_1.ZodIssueCode.invalid_enum_value,
            options: expectedValues
          });
          return parseUtil_js_1.INVALID;
        }
        return (0, parseUtil_js_1.OK)(input.data);
      }
      get enum() {
        return this._def.values;
      }
    };
    exports2.ZodNativeEnum = ZodNativeEnum;
    _ZodNativeEnum_cache = /* @__PURE__ */ new WeakMap();
    ZodNativeEnum.create = (values, params) => {
      return new ZodNativeEnum({
        values,
        typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
        ...processCreateParams(params)
      });
    };
    var ZodPromise = class extends ZodType {
      unwrap() {
        return this._def.type;
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== util_js_1.ZodParsedType.promise && ctx.common.async === false) {
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.promise,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        const promisified = ctx.parsedType === util_js_1.ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
        return (0, parseUtil_js_1.OK)(promisified.then((data) => {
          return this._def.type.parseAsync(data, {
            path: ctx.path,
            errorMap: ctx.common.contextualErrorMap
          });
        }));
      }
    };
    exports2.ZodPromise = ZodPromise;
    ZodPromise.create = (schema, params) => {
      return new ZodPromise({
        type: schema,
        typeName: ZodFirstPartyTypeKind.ZodPromise,
        ...processCreateParams(params)
      });
    };
    var ZodEffects = class extends ZodType {
      innerType() {
        return this._def.schema;
      }
      sourceType() {
        return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const effect = this._def.effect || null;
        const checkCtx = {
          addIssue: (arg) => {
            (0, parseUtil_js_1.addIssueToContext)(ctx, arg);
            if (arg.fatal) {
              status.abort();
            } else {
              status.dirty();
            }
          },
          get path() {
            return ctx.path;
          }
        };
        checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
        if (effect.type === "preprocess") {
          const processed = effect.transform(ctx.data, checkCtx);
          if (ctx.common.async) {
            return Promise.resolve(processed).then(async (processed2) => {
              if (status.value === "aborted")
                return parseUtil_js_1.INVALID;
              const result = await this._def.schema._parseAsync({
                data: processed2,
                path: ctx.path,
                parent: ctx
              });
              if (result.status === "aborted")
                return parseUtil_js_1.INVALID;
              if (result.status === "dirty")
                return (0, parseUtil_js_1.DIRTY)(result.value);
              if (status.value === "dirty")
                return (0, parseUtil_js_1.DIRTY)(result.value);
              return result;
            });
          } else {
            if (status.value === "aborted")
              return parseUtil_js_1.INVALID;
            const result = this._def.schema._parseSync({
              data: processed,
              path: ctx.path,
              parent: ctx
            });
            if (result.status === "aborted")
              return parseUtil_js_1.INVALID;
            if (result.status === "dirty")
              return (0, parseUtil_js_1.DIRTY)(result.value);
            if (status.value === "dirty")
              return (0, parseUtil_js_1.DIRTY)(result.value);
            return result;
          }
        }
        if (effect.type === "refinement") {
          const executeRefinement = (acc) => {
            const result = effect.refinement(acc, checkCtx);
            if (ctx.common.async) {
              return Promise.resolve(result);
            }
            if (result instanceof Promise) {
              throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
            }
            return acc;
          };
          if (ctx.common.async === false) {
            const inner = this._def.schema._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (inner.status === "aborted")
              return parseUtil_js_1.INVALID;
            if (inner.status === "dirty")
              status.dirty();
            executeRefinement(inner.value);
            return { status: status.value, value: inner.value };
          } else {
            return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
              if (inner.status === "aborted")
                return parseUtil_js_1.INVALID;
              if (inner.status === "dirty")
                status.dirty();
              return executeRefinement(inner.value).then(() => {
                return { status: status.value, value: inner.value };
              });
            });
          }
        }
        if (effect.type === "transform") {
          if (ctx.common.async === false) {
            const base = this._def.schema._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (!(0, parseUtil_js_1.isValid)(base))
              return base;
            const result = effect.transform(base.value, checkCtx);
            if (result instanceof Promise) {
              throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
            }
            return { status: status.value, value: result };
          } else {
            return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
              if (!(0, parseUtil_js_1.isValid)(base))
                return base;
              return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
                status: status.value,
                value: result
              }));
            });
          }
        }
        util_js_1.util.assertNever(effect);
      }
    };
    exports2.ZodEffects = ZodEffects;
    exports2.ZodTransformer = ZodEffects;
    ZodEffects.create = (schema, effect, params) => {
      return new ZodEffects({
        schema,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect,
        ...processCreateParams(params)
      });
    };
    ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
      return new ZodEffects({
        schema,
        effect: { type: "preprocess", transform: preprocess },
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        ...processCreateParams(params)
      });
    };
    var ZodOptional = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === util_js_1.ZodParsedType.undefined) {
          return (0, parseUtil_js_1.OK)(void 0);
        }
        return this._def.innerType._parse(input);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    exports2.ZodOptional = ZodOptional;
    ZodOptional.create = (type, params) => {
      return new ZodOptional({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodOptional,
        ...processCreateParams(params)
      });
    };
    var ZodNullable = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === util_js_1.ZodParsedType.null) {
          return (0, parseUtil_js_1.OK)(null);
        }
        return this._def.innerType._parse(input);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    exports2.ZodNullable = ZodNullable;
    ZodNullable.create = (type, params) => {
      return new ZodNullable({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodNullable,
        ...processCreateParams(params)
      });
    };
    var ZodDefault = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        let data = ctx.data;
        if (ctx.parsedType === util_js_1.ZodParsedType.undefined) {
          data = this._def.defaultValue();
        }
        return this._def.innerType._parse({
          data,
          path: ctx.path,
          parent: ctx
        });
      }
      removeDefault() {
        return this._def.innerType;
      }
    };
    exports2.ZodDefault = ZodDefault;
    ZodDefault.create = (type, params) => {
      return new ZodDefault({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodDefault,
        defaultValue: typeof params.default === "function" ? params.default : () => params.default,
        ...processCreateParams(params)
      });
    };
    var ZodCatch = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const newCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          }
        };
        const result = this._def.innerType._parse({
          data: newCtx.data,
          path: newCtx.path,
          parent: {
            ...newCtx
          }
        });
        if ((0, parseUtil_js_1.isAsync)(result)) {
          return result.then((result2) => {
            return {
              status: "valid",
              value: result2.status === "valid" ? result2.value : this._def.catchValue({
                get error() {
                  return new ZodError_js_1.ZodError(newCtx.common.issues);
                },
                input: newCtx.data
              })
            };
          });
        } else {
          return {
            status: "valid",
            value: result.status === "valid" ? result.value : this._def.catchValue({
              get error() {
                return new ZodError_js_1.ZodError(newCtx.common.issues);
              },
              input: newCtx.data
            })
          };
        }
      }
      removeCatch() {
        return this._def.innerType;
      }
    };
    exports2.ZodCatch = ZodCatch;
    ZodCatch.create = (type, params) => {
      return new ZodCatch({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodCatch,
        catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
        ...processCreateParams(params)
      });
    };
    var ZodNaN = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== util_js_1.ZodParsedType.nan) {
          const ctx = this._getOrReturnCtx(input);
          (0, parseUtil_js_1.addIssueToContext)(ctx, {
            code: ZodError_js_1.ZodIssueCode.invalid_type,
            expected: util_js_1.ZodParsedType.nan,
            received: ctx.parsedType
          });
          return parseUtil_js_1.INVALID;
        }
        return { status: "valid", value: input.data };
      }
    };
    exports2.ZodNaN = ZodNaN;
    ZodNaN.create = (params) => {
      return new ZodNaN({
        typeName: ZodFirstPartyTypeKind.ZodNaN,
        ...processCreateParams(params)
      });
    };
    exports2.BRAND = Symbol("zod_brand");
    var ZodBranded = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const data = ctx.data;
        return this._def.type._parse({
          data,
          path: ctx.path,
          parent: ctx
        });
      }
      unwrap() {
        return this._def.type;
      }
    };
    exports2.ZodBranded = ZodBranded;
    var ZodPipeline = class _ZodPipeline extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.common.async) {
          const handleAsync = async () => {
            const inResult = await this._def.in._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (inResult.status === "aborted")
              return parseUtil_js_1.INVALID;
            if (inResult.status === "dirty") {
              status.dirty();
              return (0, parseUtil_js_1.DIRTY)(inResult.value);
            } else {
              return this._def.out._parseAsync({
                data: inResult.value,
                path: ctx.path,
                parent: ctx
              });
            }
          };
          return handleAsync();
        } else {
          const inResult = this._def.in._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inResult.status === "aborted")
            return parseUtil_js_1.INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return {
              status: "dirty",
              value: inResult.value
            };
          } else {
            return this._def.out._parseSync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            });
          }
        }
      }
      static create(a, b) {
        return new _ZodPipeline({
          in: a,
          out: b,
          typeName: ZodFirstPartyTypeKind.ZodPipeline
        });
      }
    };
    exports2.ZodPipeline = ZodPipeline;
    var ZodReadonly = class extends ZodType {
      _parse(input) {
        const result = this._def.innerType._parse(input);
        const freeze = (data) => {
          if ((0, parseUtil_js_1.isValid)(data)) {
            data.value = Object.freeze(data.value);
          }
          return data;
        };
        return (0, parseUtil_js_1.isAsync)(result) ? result.then((data) => freeze(data)) : freeze(result);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    exports2.ZodReadonly = ZodReadonly;
    ZodReadonly.create = (type, params) => {
      return new ZodReadonly({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodReadonly,
        ...processCreateParams(params)
      });
    };
    function cleanParams(params, data) {
      const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
      const p2 = typeof p === "string" ? { message: p } : p;
      return p2;
    }
    function custom(check, _params = {}, fatal) {
      if (check)
        return ZodAny.create().superRefine((data, ctx) => {
          const r = check(data);
          if (r instanceof Promise) {
            return r.then((r2) => {
              if (!r2) {
                const params = cleanParams(_params, data);
                const _fatal = params.fatal ?? fatal ?? true;
                ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
              }
            });
          }
          if (!r) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
          return;
        });
      return ZodAny.create();
    }
    exports2.late = {
      object: ZodObject.lazycreate
    };
    var ZodFirstPartyTypeKind;
    (function(ZodFirstPartyTypeKind2) {
      ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
      ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
      ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
      ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
      ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
      ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
      ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
      ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
      ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
      ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
      ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
      ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
      ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
      ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
      ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
      ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
      ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
      ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
      ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
      ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
      ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
      ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
      ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
      ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
      ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
      ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
      ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
      ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
      ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
      ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
      ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
      ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
      ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
      ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
      ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
      ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
    })(ZodFirstPartyTypeKind || (exports2.ZodFirstPartyTypeKind = ZodFirstPartyTypeKind = {}));
    var instanceOfType = (cls, params = {
      message: `Input not instance of ${cls.name}`
    }) => custom((data) => data instanceof cls, params);
    exports2.instanceof = instanceOfType;
    var stringType = ZodString.create;
    exports2.string = stringType;
    var numberType = ZodNumber.create;
    exports2.number = numberType;
    var nanType = ZodNaN.create;
    exports2.nan = nanType;
    var bigIntType = ZodBigInt.create;
    exports2.bigint = bigIntType;
    var booleanType = ZodBoolean.create;
    exports2.boolean = booleanType;
    var dateType = ZodDate.create;
    exports2.date = dateType;
    var symbolType = ZodSymbol.create;
    exports2.symbol = symbolType;
    var undefinedType = ZodUndefined.create;
    exports2.undefined = undefinedType;
    var nullType = ZodNull.create;
    exports2.null = nullType;
    var anyType = ZodAny.create;
    exports2.any = anyType;
    var unknownType = ZodUnknown.create;
    exports2.unknown = unknownType;
    var neverType = ZodNever.create;
    exports2.never = neverType;
    var voidType = ZodVoid.create;
    exports2.void = voidType;
    var arrayType = ZodArray.create;
    exports2.array = arrayType;
    var objectType = ZodObject.create;
    exports2.object = objectType;
    var strictObjectType = ZodObject.strictCreate;
    exports2.strictObject = strictObjectType;
    var unionType = ZodUnion.create;
    exports2.union = unionType;
    var discriminatedUnionType = ZodDiscriminatedUnion.create;
    exports2.discriminatedUnion = discriminatedUnionType;
    var intersectionType = ZodIntersection.create;
    exports2.intersection = intersectionType;
    var tupleType = ZodTuple.create;
    exports2.tuple = tupleType;
    var recordType = ZodRecord.create;
    exports2.record = recordType;
    var mapType = ZodMap.create;
    exports2.map = mapType;
    var setType = ZodSet.create;
    exports2.set = setType;
    var functionType = ZodFunction.create;
    exports2.function = functionType;
    var lazyType = ZodLazy.create;
    exports2.lazy = lazyType;
    var literalType = ZodLiteral.create;
    exports2.literal = literalType;
    var enumType = ZodEnum.create;
    exports2.enum = enumType;
    var nativeEnumType = ZodNativeEnum.create;
    exports2.nativeEnum = nativeEnumType;
    var promiseType = ZodPromise.create;
    exports2.promise = promiseType;
    var effectsType = ZodEffects.create;
    exports2.effect = effectsType;
    exports2.transformer = effectsType;
    var optionalType = ZodOptional.create;
    exports2.optional = optionalType;
    var nullableType = ZodNullable.create;
    exports2.nullable = nullableType;
    var preprocessType = ZodEffects.createWithPreprocess;
    exports2.preprocess = preprocessType;
    var pipelineType = ZodPipeline.create;
    exports2.pipeline = pipelineType;
    var ostring = () => stringType().optional();
    exports2.ostring = ostring;
    var onumber = () => numberType().optional();
    exports2.onumber = onumber;
    var oboolean = () => booleanType().optional();
    exports2.oboolean = oboolean;
    exports2.coerce = {
      string: ((arg) => ZodString.create({ ...arg, coerce: true })),
      number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
      boolean: ((arg) => ZodBoolean.create({
        ...arg,
        coerce: true
      })),
      bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
      date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
    };
    exports2.NEVER = parseUtil_js_1.INVALID;
  }
});

// node_modules/zod/dist/cjs/v3/external.js
var require_external = __commonJS({
  "node_modules/zod/dist/cjs/v3/external.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    __exportStar(require_errors2(), exports2);
    __exportStar(require_parseUtil(), exports2);
    __exportStar(require_typeAliases(), exports2);
    __exportStar(require_util(), exports2);
    __exportStar(require_types(), exports2);
    __exportStar(require_ZodError(), exports2);
  }
});

// node_modules/zod/dist/cjs/v3/index.js
var require_v3 = __commonJS({
  "node_modules/zod/dist/cjs/v3/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.z = void 0;
    var z = __importStar(require_external());
    exports2.z = z;
    __exportStar(require_external(), exports2);
    exports2.default = z;
  }
});

// node_modules/zod/dist/cjs/index.js
var require_cjs = __commonJS({
  "node_modules/zod/dist/cjs/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var index_js_1 = __importDefault(require_v3());
    __exportStar(require_v3(), exports2);
    exports2.default = index_js_1.default;
  }
});

// node_modules/@aws-amplify/platform-core/lib/package_json_reader.js
var require_package_json_reader = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/package_json_reader.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.packageJsonSchema = exports2.PackageJsonReader = void 0;
    var fs_1 = __importDefault(require("fs"));
    var path_1 = __importDefault(require("path"));
    var zod_1 = __importDefault(require_cjs());
    var errors_1 = require_errors();
    var PackageJsonReader = class {
      read = (absolutePackageJsonPath) => {
        if (!fs_1.default.existsSync(absolutePackageJsonPath)) {
          throw new errors_1.AmplifyUserError("InvalidPackageJsonError", {
            message: `Could not find a package.json file at ${absolutePackageJsonPath}`,
            resolution: `Ensure that ${absolutePackageJsonPath} exists and is a valid JSON file`
          });
        }
        let jsonParsedValue;
        try {
          jsonParsedValue = JSON.parse(
            // we have to use sync fs methods here because this is also used during cdk synth
            fs_1.default.readFileSync(absolutePackageJsonPath, "utf-8")
          );
        } catch (err) {
          throw new errors_1.AmplifyUserError("InvalidPackageJsonError", {
            message: `Could not parse the contents of ${absolutePackageJsonPath}`,
            resolution: `Ensure that ${absolutePackageJsonPath} exists and is a valid JSON file`
          }, err);
        }
        return exports2.packageJsonSchema.parse(jsonParsedValue);
      };
      /**
       * Returns the contents of the package.json file in process.cwd()
       *
       * If no package.json file exists, or the content does not pass validation, an error is thrown
       */
      readFromCwd = () => {
        return this.read(path_1.default.resolve(process.cwd(), "package.json"));
      };
    };
    exports2.PackageJsonReader = PackageJsonReader;
    exports2.packageJsonSchema = zod_1.default.object({
      name: zod_1.default.string().optional(),
      version: zod_1.default.string().optional(),
      type: zod_1.default.union([zod_1.default.literal("module"), zod_1.default.literal("commonjs")]).optional()
    });
  }
});

// node_modules/@aws-amplify/platform-core/lib/config/get_config_dir_path.js
var require_get_config_dir_path = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/config/get_config_dir_path.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getConfigDirPath = void 0;
    var os_1 = __importDefault(require("os"));
    var path_1 = __importDefault(require("path"));
    var getConfigDirPath = () => {
      const amplifyConfigDirName = "amplify";
      const homedir = os_1.default.homedir();
      const macos = () => path_1.default.join(homedir, "Library", "Preferences", amplifyConfigDirName);
      const windows = () => {
        return path_1.default.join(process.env.APPDATA || path_1.default.join(homedir, "AppData", "Roaming"), amplifyConfigDirName, "Config");
      };
      const linux = () => {
        return path_1.default.join(process.env.XDG_STATE_HOME || path_1.default.join(homedir, ".local", "state"), amplifyConfigDirName);
      };
      switch (process.platform) {
        case "darwin":
          return macos();
        case "win32":
          return windows();
        default:
          return linux();
      }
    };
    exports2.getConfigDirPath = getConfigDirPath;
  }
});

// node_modules/@aws-amplify/platform-core/lib/config/local_configuration_controller.js
var require_local_configuration_controller = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/config/local_configuration_controller.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LocalConfigurationController = void 0;
    var path_1 = __importDefault(require("path"));
    var promises_1 = __importDefault(require("fs/promises"));
    var get_config_dir_path_1 = require_get_config_dir_path();
    var LocalConfigurationController = class {
      configFileName;
      dirPath;
      configFilePath;
      _store;
      /**
       * Initializes paths to project config dir & config file.
       */
      constructor(configFileName = "config.json") {
        this.configFileName = configFileName;
        this.dirPath = (0, get_config_dir_path_1.getConfigDirPath)();
        this.configFilePath = path_1.default.join(this.dirPath, this.configFileName);
      }
      /**
       * Gets values from cached config by path.
       */
      async get(path) {
        return path.split(".").reduce((acc, current) => {
          return acc?.[current];
        }, await this.store());
      }
      /**
       * Set value by path & update config file to disk.
       */
      async set(path, value) {
        let current = await this.store();
        path.split(".").forEach((key, index, keys) => {
          if (index === keys.length - 1) {
            current[key] = value;
          } else {
            if (current[key] == null) {
              current[key] = {};
            }
            current = current[key];
          }
        });
        await this.write();
      }
      /**
       * Writes config file to disk if found.
       */
      async write() {
        await this.mkConfigDir();
        const output = JSON.stringify(this._store ? this._store : {});
        await promises_1.default.writeFile(this.configFilePath, output, "utf8");
      }
      /**
       * Reset cached config and delete the config file.
       */
      async clear() {
        this._store = {};
        await promises_1.default.rm(this.configFilePath);
      }
      /**
       * Getter for cached config, retrieves config from disk if not cached already.
       * If the store is not cached & config file does not exist, it will create a blank one.
       */
      async store() {
        if (this._store) {
          return this._store;
        }
        let fd;
        try {
          fd = await promises_1.default.open(this.configFilePath, promises_1.default.constants.F_OK, promises_1.default.constants.O_RDWR);
          const fileContent = await promises_1.default.readFile(fd, "utf-8");
          this._store = JSON.parse(fileContent);
        } catch {
          this._store = {};
          await this.write();
        } finally {
          await fd?.close();
        }
        return this._store;
      }
      /**
       * Creates project directory to store config if it doesn't exist yet.
       */
      mkConfigDir() {
        return promises_1.default.mkdir(this.dirPath, { recursive: true });
      }
    };
    exports2.LocalConfigurationController = LocalConfigurationController;
  }
});

// node_modules/@aws-amplify/platform-core/lib/config/local_configuration_controller_factory.js
var require_local_configuration_controller_factory = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/config/local_configuration_controller_factory.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.configControllerFactory = exports2.ConfigurationControllerFactory = void 0;
    var local_configuration_controller_js_1 = require_local_configuration_controller();
    var ConfigurationControllerFactory = class {
      controllers;
      /**
       * initialized empty map of ConfigurationController;
       */
      constructor() {
        this.controllers = {};
      }
      /**
       * Returns a LocalConfigurationController
       */
      getInstance = (configFileName) => {
        if (this.controllers[configFileName]) {
          return this.controllers[configFileName];
        }
        this.controllers[configFileName] = new local_configuration_controller_js_1.LocalConfigurationController(configFileName);
        return this.controllers[configFileName];
      };
    };
    exports2.ConfigurationControllerFactory = ConfigurationControllerFactory;
    exports2.configControllerFactory = new ConfigurationControllerFactory();
  }
});

// node_modules/@aws-amplify/platform-core/lib/usage-data/noop_usage_data_emitter.js
var require_noop_usage_data_emitter = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/usage-data/noop_usage_data_emitter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NoOpUsageDataEmitter = void 0;
    var NoOpUsageDataEmitter = class {
      /**
       * no-op emitSuccess
       */
      emitSuccess() {
        return Promise.resolve();
      }
      /**
       * no-op emitFailure
       */
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      emitFailure() {
        return Promise.resolve();
      }
    };
    exports2.NoOpUsageDataEmitter = NoOpUsageDataEmitter;
  }
});

// node_modules/uuid/dist/cjs/max.js
var require_max = __commonJS({
  "node_modules/uuid/dist/cjs/max.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = "ffffffff-ffff-ffff-ffff-ffffffffffff";
  }
});

// node_modules/uuid/dist/cjs/nil.js
var require_nil = __commonJS({
  "node_modules/uuid/dist/cjs/nil.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = "00000000-0000-0000-0000-000000000000";
  }
});

// node_modules/uuid/dist/cjs/regex.js
var require_regex = __commonJS({
  "node_modules/uuid/dist/cjs/regex.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;
  }
});

// node_modules/uuid/dist/cjs/validate.js
var require_validate = __commonJS({
  "node_modules/uuid/dist/cjs/validate.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var regex_js_1 = require_regex();
    function validate(uuid) {
      return typeof uuid === "string" && regex_js_1.default.test(uuid);
    }
    exports2.default = validate;
  }
});

// node_modules/uuid/dist/cjs/parse.js
var require_parse = __commonJS({
  "node_modules/uuid/dist/cjs/parse.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var validate_js_1 = require_validate();
    function parse(uuid) {
      if (!(0, validate_js_1.default)(uuid)) {
        throw TypeError("Invalid UUID");
      }
      let v;
      return Uint8Array.of((v = parseInt(uuid.slice(0, 8), 16)) >>> 24, v >>> 16 & 255, v >>> 8 & 255, v & 255, (v = parseInt(uuid.slice(9, 13), 16)) >>> 8, v & 255, (v = parseInt(uuid.slice(14, 18), 16)) >>> 8, v & 255, (v = parseInt(uuid.slice(19, 23), 16)) >>> 8, v & 255, (v = parseInt(uuid.slice(24, 36), 16)) / 1099511627776 & 255, v / 4294967296 & 255, v >>> 24 & 255, v >>> 16 & 255, v >>> 8 & 255, v & 255);
    }
    exports2.default = parse;
  }
});

// node_modules/uuid/dist/cjs/stringify.js
var require_stringify = __commonJS({
  "node_modules/uuid/dist/cjs/stringify.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.unsafeStringify = void 0;
    var validate_js_1 = require_validate();
    var byteToHex = [];
    for (let i = 0; i < 256; ++i) {
      byteToHex.push((i + 256).toString(16).slice(1));
    }
    function unsafeStringify(arr, offset = 0) {
      return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
    }
    exports2.unsafeStringify = unsafeStringify;
    function stringify(arr, offset = 0) {
      const uuid = unsafeStringify(arr, offset);
      if (!(0, validate_js_1.default)(uuid)) {
        throw TypeError("Stringified UUID is invalid");
      }
      return uuid;
    }
    exports2.default = stringify;
  }
});

// node_modules/uuid/dist/cjs/rng.js
var require_rng = __commonJS({
  "node_modules/uuid/dist/cjs/rng.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var crypto_1 = require("crypto");
    var rnds8Pool = new Uint8Array(256);
    var poolPtr = rnds8Pool.length;
    function rng() {
      if (poolPtr > rnds8Pool.length - 16) {
        (0, crypto_1.randomFillSync)(rnds8Pool);
        poolPtr = 0;
      }
      return rnds8Pool.slice(poolPtr, poolPtr += 16);
    }
    exports2.default = rng;
  }
});

// node_modules/uuid/dist/cjs/v1.js
var require_v1 = __commonJS({
  "node_modules/uuid/dist/cjs/v1.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.updateV1State = void 0;
    var rng_js_1 = require_rng();
    var stringify_js_1 = require_stringify();
    var _state = {};
    function v1(options, buf, offset) {
      let bytes;
      const isV6 = options?._v6 ?? false;
      if (options) {
        const optionsKeys = Object.keys(options);
        if (optionsKeys.length === 1 && optionsKeys[0] === "_v6") {
          options = void 0;
        }
      }
      if (options) {
        bytes = v1Bytes(options.random ?? options.rng?.() ?? (0, rng_js_1.default)(), options.msecs, options.nsecs, options.clockseq, options.node, buf, offset);
      } else {
        const now = Date.now();
        const rnds = (0, rng_js_1.default)();
        updateV1State(_state, now, rnds);
        bytes = v1Bytes(rnds, _state.msecs, _state.nsecs, isV6 ? void 0 : _state.clockseq, isV6 ? void 0 : _state.node, buf, offset);
      }
      return buf ?? (0, stringify_js_1.unsafeStringify)(bytes);
    }
    function updateV1State(state, now, rnds) {
      state.msecs ??= -Infinity;
      state.nsecs ??= 0;
      if (now === state.msecs) {
        state.nsecs++;
        if (state.nsecs >= 1e4) {
          state.node = void 0;
          state.nsecs = 0;
        }
      } else if (now > state.msecs) {
        state.nsecs = 0;
      } else if (now < state.msecs) {
        state.node = void 0;
      }
      if (!state.node) {
        state.node = rnds.slice(10, 16);
        state.node[0] |= 1;
        state.clockseq = (rnds[8] << 8 | rnds[9]) & 16383;
      }
      state.msecs = now;
      return state;
    }
    exports2.updateV1State = updateV1State;
    function v1Bytes(rnds, msecs, nsecs, clockseq, node, buf, offset = 0) {
      if (rnds.length < 16) {
        throw new Error("Random bytes length must be >= 16");
      }
      if (!buf) {
        buf = new Uint8Array(16);
        offset = 0;
      } else {
        if (offset < 0 || offset + 16 > buf.length) {
          throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
        }
      }
      msecs ??= Date.now();
      nsecs ??= 0;
      clockseq ??= (rnds[8] << 8 | rnds[9]) & 16383;
      node ??= rnds.slice(10, 16);
      msecs += 122192928e5;
      const tl = ((msecs & 268435455) * 1e4 + nsecs) % 4294967296;
      buf[offset++] = tl >>> 24 & 255;
      buf[offset++] = tl >>> 16 & 255;
      buf[offset++] = tl >>> 8 & 255;
      buf[offset++] = tl & 255;
      const tmh = msecs / 4294967296 * 1e4 & 268435455;
      buf[offset++] = tmh >>> 8 & 255;
      buf[offset++] = tmh & 255;
      buf[offset++] = tmh >>> 24 & 15 | 16;
      buf[offset++] = tmh >>> 16 & 255;
      buf[offset++] = clockseq >>> 8 | 128;
      buf[offset++] = clockseq & 255;
      for (let n = 0; n < 6; ++n) {
        buf[offset++] = node[n];
      }
      return buf;
    }
    exports2.default = v1;
  }
});

// node_modules/uuid/dist/cjs/v1ToV6.js
var require_v1ToV6 = __commonJS({
  "node_modules/uuid/dist/cjs/v1ToV6.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var parse_js_1 = require_parse();
    var stringify_js_1 = require_stringify();
    function v1ToV6(uuid) {
      const v1Bytes = typeof uuid === "string" ? (0, parse_js_1.default)(uuid) : uuid;
      const v6Bytes = _v1ToV6(v1Bytes);
      return typeof uuid === "string" ? (0, stringify_js_1.unsafeStringify)(v6Bytes) : v6Bytes;
    }
    exports2.default = v1ToV6;
    function _v1ToV6(v1Bytes) {
      return Uint8Array.of((v1Bytes[6] & 15) << 4 | v1Bytes[7] >> 4 & 15, (v1Bytes[7] & 15) << 4 | (v1Bytes[4] & 240) >> 4, (v1Bytes[4] & 15) << 4 | (v1Bytes[5] & 240) >> 4, (v1Bytes[5] & 15) << 4 | (v1Bytes[0] & 240) >> 4, (v1Bytes[0] & 15) << 4 | (v1Bytes[1] & 240) >> 4, (v1Bytes[1] & 15) << 4 | (v1Bytes[2] & 240) >> 4, 96 | v1Bytes[2] & 15, v1Bytes[3], v1Bytes[8], v1Bytes[9], v1Bytes[10], v1Bytes[11], v1Bytes[12], v1Bytes[13], v1Bytes[14], v1Bytes[15]);
    }
  }
});

// node_modules/uuid/dist/cjs/md5.js
var require_md5 = __commonJS({
  "node_modules/uuid/dist/cjs/md5.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var crypto_1 = require("crypto");
    function md5(bytes) {
      if (Array.isArray(bytes)) {
        bytes = Buffer.from(bytes);
      } else if (typeof bytes === "string") {
        bytes = Buffer.from(bytes, "utf8");
      }
      return (0, crypto_1.createHash)("md5").update(bytes).digest();
    }
    exports2.default = md5;
  }
});

// node_modules/uuid/dist/cjs/v35.js
var require_v35 = __commonJS({
  "node_modules/uuid/dist/cjs/v35.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.URL = exports2.DNS = exports2.stringToBytes = void 0;
    var parse_js_1 = require_parse();
    var stringify_js_1 = require_stringify();
    function stringToBytes(str) {
      str = unescape(encodeURIComponent(str));
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; ++i) {
        bytes[i] = str.charCodeAt(i);
      }
      return bytes;
    }
    exports2.stringToBytes = stringToBytes;
    exports2.DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    exports2.URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
    function v35(version, hash, value, namespace, buf, offset) {
      const valueBytes = typeof value === "string" ? stringToBytes(value) : value;
      const namespaceBytes = typeof namespace === "string" ? (0, parse_js_1.default)(namespace) : namespace;
      if (typeof namespace === "string") {
        namespace = (0, parse_js_1.default)(namespace);
      }
      if (namespace?.length !== 16) {
        throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
      }
      let bytes = new Uint8Array(16 + valueBytes.length);
      bytes.set(namespaceBytes);
      bytes.set(valueBytes, namespaceBytes.length);
      bytes = hash(bytes);
      bytes[6] = bytes[6] & 15 | version;
      bytes[8] = bytes[8] & 63 | 128;
      if (buf) {
        offset = offset || 0;
        for (let i = 0; i < 16; ++i) {
          buf[offset + i] = bytes[i];
        }
        return buf;
      }
      return (0, stringify_js_1.unsafeStringify)(bytes);
    }
    exports2.default = v35;
  }
});

// node_modules/uuid/dist/cjs/v3.js
var require_v32 = __commonJS({
  "node_modules/uuid/dist/cjs/v3.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.URL = exports2.DNS = void 0;
    var md5_js_1 = require_md5();
    var v35_js_1 = require_v35();
    var v35_js_2 = require_v35();
    Object.defineProperty(exports2, "DNS", { enumerable: true, get: function() {
      return v35_js_2.DNS;
    } });
    Object.defineProperty(exports2, "URL", { enumerable: true, get: function() {
      return v35_js_2.URL;
    } });
    function v3(value, namespace, buf, offset) {
      return (0, v35_js_1.default)(48, md5_js_1.default, value, namespace, buf, offset);
    }
    v3.DNS = v35_js_1.DNS;
    v3.URL = v35_js_1.URL;
    exports2.default = v3;
  }
});

// node_modules/uuid/dist/cjs/native.js
var require_native = __commonJS({
  "node_modules/uuid/dist/cjs/native.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var crypto_1 = require("crypto");
    exports2.default = { randomUUID: crypto_1.randomUUID };
  }
});

// node_modules/uuid/dist/cjs/v4.js
var require_v4 = __commonJS({
  "node_modules/uuid/dist/cjs/v4.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var native_js_1 = require_native();
    var rng_js_1 = require_rng();
    var stringify_js_1 = require_stringify();
    function v4(options, buf, offset) {
      if (native_js_1.default.randomUUID && !buf && !options) {
        return native_js_1.default.randomUUID();
      }
      options = options || {};
      const rnds = options.random ?? options.rng?.() ?? (0, rng_js_1.default)();
      if (rnds.length < 16) {
        throw new Error("Random bytes length must be >= 16");
      }
      rnds[6] = rnds[6] & 15 | 64;
      rnds[8] = rnds[8] & 63 | 128;
      if (buf) {
        offset = offset || 0;
        if (offset < 0 || offset + 16 > buf.length) {
          throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
        }
        for (let i = 0; i < 16; ++i) {
          buf[offset + i] = rnds[i];
        }
        return buf;
      }
      return (0, stringify_js_1.unsafeStringify)(rnds);
    }
    exports2.default = v4;
  }
});

// node_modules/uuid/dist/cjs/sha1.js
var require_sha1 = __commonJS({
  "node_modules/uuid/dist/cjs/sha1.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var crypto_1 = require("crypto");
    function sha1(bytes) {
      if (Array.isArray(bytes)) {
        bytes = Buffer.from(bytes);
      } else if (typeof bytes === "string") {
        bytes = Buffer.from(bytes, "utf8");
      }
      return (0, crypto_1.createHash)("sha1").update(bytes).digest();
    }
    exports2.default = sha1;
  }
});

// node_modules/uuid/dist/cjs/v5.js
var require_v5 = __commonJS({
  "node_modules/uuid/dist/cjs/v5.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.URL = exports2.DNS = void 0;
    var sha1_js_1 = require_sha1();
    var v35_js_1 = require_v35();
    var v35_js_2 = require_v35();
    Object.defineProperty(exports2, "DNS", { enumerable: true, get: function() {
      return v35_js_2.DNS;
    } });
    Object.defineProperty(exports2, "URL", { enumerable: true, get: function() {
      return v35_js_2.URL;
    } });
    function v5(value, namespace, buf, offset) {
      return (0, v35_js_1.default)(80, sha1_js_1.default, value, namespace, buf, offset);
    }
    v5.DNS = v35_js_1.DNS;
    v5.URL = v35_js_1.URL;
    exports2.default = v5;
  }
});

// node_modules/uuid/dist/cjs/v6.js
var require_v6 = __commonJS({
  "node_modules/uuid/dist/cjs/v6.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var stringify_js_1 = require_stringify();
    var v1_js_1 = require_v1();
    var v1ToV6_js_1 = require_v1ToV6();
    function v6(options, buf, offset) {
      options ??= {};
      offset ??= 0;
      let bytes = (0, v1_js_1.default)({ ...options, _v6: true }, new Uint8Array(16));
      bytes = (0, v1ToV6_js_1.default)(bytes);
      if (buf) {
        for (let i = 0; i < 16; i++) {
          buf[offset + i] = bytes[i];
        }
        return buf;
      }
      return (0, stringify_js_1.unsafeStringify)(bytes);
    }
    exports2.default = v6;
  }
});

// node_modules/uuid/dist/cjs/v6ToV1.js
var require_v6ToV1 = __commonJS({
  "node_modules/uuid/dist/cjs/v6ToV1.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var parse_js_1 = require_parse();
    var stringify_js_1 = require_stringify();
    function v6ToV1(uuid) {
      const v6Bytes = typeof uuid === "string" ? (0, parse_js_1.default)(uuid) : uuid;
      const v1Bytes = _v6ToV1(v6Bytes);
      return typeof uuid === "string" ? (0, stringify_js_1.unsafeStringify)(v1Bytes) : v1Bytes;
    }
    exports2.default = v6ToV1;
    function _v6ToV1(v6Bytes) {
      return Uint8Array.of((v6Bytes[3] & 15) << 4 | v6Bytes[4] >> 4 & 15, (v6Bytes[4] & 15) << 4 | (v6Bytes[5] & 240) >> 4, (v6Bytes[5] & 15) << 4 | v6Bytes[6] & 15, v6Bytes[7], (v6Bytes[1] & 15) << 4 | (v6Bytes[2] & 240) >> 4, (v6Bytes[2] & 15) << 4 | (v6Bytes[3] & 240) >> 4, 16 | (v6Bytes[0] & 240) >> 4, (v6Bytes[0] & 15) << 4 | (v6Bytes[1] & 240) >> 4, v6Bytes[8], v6Bytes[9], v6Bytes[10], v6Bytes[11], v6Bytes[12], v6Bytes[13], v6Bytes[14], v6Bytes[15]);
    }
  }
});

// node_modules/uuid/dist/cjs/v7.js
var require_v7 = __commonJS({
  "node_modules/uuid/dist/cjs/v7.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.updateV7State = void 0;
    var rng_js_1 = require_rng();
    var stringify_js_1 = require_stringify();
    var _state = {};
    function v7(options, buf, offset) {
      let bytes;
      if (options) {
        bytes = v7Bytes(options.random ?? options.rng?.() ?? (0, rng_js_1.default)(), options.msecs, options.seq, buf, offset);
      } else {
        const now = Date.now();
        const rnds = (0, rng_js_1.default)();
        updateV7State(_state, now, rnds);
        bytes = v7Bytes(rnds, _state.msecs, _state.seq, buf, offset);
      }
      return buf ?? (0, stringify_js_1.unsafeStringify)(bytes);
    }
    function updateV7State(state, now, rnds) {
      state.msecs ??= -Infinity;
      state.seq ??= 0;
      if (now > state.msecs) {
        state.seq = rnds[6] << 23 | rnds[7] << 16 | rnds[8] << 8 | rnds[9];
        state.msecs = now;
      } else {
        state.seq = state.seq + 1 | 0;
        if (state.seq === 0) {
          state.msecs++;
        }
      }
      return state;
    }
    exports2.updateV7State = updateV7State;
    function v7Bytes(rnds, msecs, seq, buf, offset = 0) {
      if (rnds.length < 16) {
        throw new Error("Random bytes length must be >= 16");
      }
      if (!buf) {
        buf = new Uint8Array(16);
        offset = 0;
      } else {
        if (offset < 0 || offset + 16 > buf.length) {
          throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
        }
      }
      msecs ??= Date.now();
      seq ??= rnds[6] * 127 << 24 | rnds[7] << 16 | rnds[8] << 8 | rnds[9];
      buf[offset++] = msecs / 1099511627776 & 255;
      buf[offset++] = msecs / 4294967296 & 255;
      buf[offset++] = msecs / 16777216 & 255;
      buf[offset++] = msecs / 65536 & 255;
      buf[offset++] = msecs / 256 & 255;
      buf[offset++] = msecs & 255;
      buf[offset++] = 112 | seq >>> 28 & 15;
      buf[offset++] = seq >>> 20 & 255;
      buf[offset++] = 128 | seq >>> 14 & 63;
      buf[offset++] = seq >>> 6 & 255;
      buf[offset++] = seq << 2 & 255 | rnds[10] & 3;
      buf[offset++] = rnds[11];
      buf[offset++] = rnds[12];
      buf[offset++] = rnds[13];
      buf[offset++] = rnds[14];
      buf[offset++] = rnds[15];
      return buf;
    }
    exports2.default = v7;
  }
});

// node_modules/uuid/dist/cjs/version.js
var require_version = __commonJS({
  "node_modules/uuid/dist/cjs/version.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var validate_js_1 = require_validate();
    function version(uuid) {
      if (!(0, validate_js_1.default)(uuid)) {
        throw TypeError("Invalid UUID");
      }
      return parseInt(uuid.slice(14, 15), 16);
    }
    exports2.default = version;
  }
});

// node_modules/uuid/dist/cjs/index.js
var require_cjs2 = __commonJS({
  "node_modules/uuid/dist/cjs/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.version = exports2.validate = exports2.v7 = exports2.v6ToV1 = exports2.v6 = exports2.v5 = exports2.v4 = exports2.v3 = exports2.v1ToV6 = exports2.v1 = exports2.stringify = exports2.parse = exports2.NIL = exports2.MAX = void 0;
    var max_js_1 = require_max();
    Object.defineProperty(exports2, "MAX", { enumerable: true, get: function() {
      return max_js_1.default;
    } });
    var nil_js_1 = require_nil();
    Object.defineProperty(exports2, "NIL", { enumerable: true, get: function() {
      return nil_js_1.default;
    } });
    var parse_js_1 = require_parse();
    Object.defineProperty(exports2, "parse", { enumerable: true, get: function() {
      return parse_js_1.default;
    } });
    var stringify_js_1 = require_stringify();
    Object.defineProperty(exports2, "stringify", { enumerable: true, get: function() {
      return stringify_js_1.default;
    } });
    var v1_js_1 = require_v1();
    Object.defineProperty(exports2, "v1", { enumerable: true, get: function() {
      return v1_js_1.default;
    } });
    var v1ToV6_js_1 = require_v1ToV6();
    Object.defineProperty(exports2, "v1ToV6", { enumerable: true, get: function() {
      return v1ToV6_js_1.default;
    } });
    var v3_js_1 = require_v32();
    Object.defineProperty(exports2, "v3", { enumerable: true, get: function() {
      return v3_js_1.default;
    } });
    var v4_js_1 = require_v4();
    Object.defineProperty(exports2, "v4", { enumerable: true, get: function() {
      return v4_js_1.default;
    } });
    var v5_js_1 = require_v5();
    Object.defineProperty(exports2, "v5", { enumerable: true, get: function() {
      return v5_js_1.default;
    } });
    var v6_js_1 = require_v6();
    Object.defineProperty(exports2, "v6", { enumerable: true, get: function() {
      return v6_js_1.default;
    } });
    var v6ToV1_js_1 = require_v6ToV1();
    Object.defineProperty(exports2, "v6ToV1", { enumerable: true, get: function() {
      return v6ToV1_js_1.default;
    } });
    var v7_js_1 = require_v7();
    Object.defineProperty(exports2, "v7", { enumerable: true, get: function() {
      return v7_js_1.default;
    } });
    var validate_js_1 = require_validate();
    Object.defineProperty(exports2, "validate", { enumerable: true, get: function() {
      return validate_js_1.default;
    } });
    var version_js_1 = require_version();
    Object.defineProperty(exports2, "version", { enumerable: true, get: function() {
      return version_js_1.default;
    } });
  }
});

// node_modules/@aws-amplify/platform-core/lib/usage-data/account_id_fetcher.js
var require_account_id_fetcher = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/usage-data/account_id_fetcher.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AccountIdFetcher = void 0;
    var client_sts_1 = require("@aws-sdk/client-sts");
    var uuid_1 = require_cjs2();
    var NO_ACCOUNT_ID = "NO_ACCOUNT_ID";
    var AMPLIFY_CLI_UUID_NAMESPACE = "283cae3e-c611-4659-9044-6796e5d696ec";
    var AccountIdFetcher = class {
      stsClient;
      accountId;
      /**
       * constructor for AccountIdFetcher
       */
      constructor(stsClient = new client_sts_1.STSClient()) {
        this.stsClient = stsClient;
      }
      fetch = async () => {
        if (this.accountId) {
          return this.accountId;
        }
        try {
          const stsResponse = await this.stsClient.send(new client_sts_1.GetCallerIdentityCommand({}));
          if (stsResponse && stsResponse.Account) {
            const accountIdBucket = stsResponse.Account.slice(0, -2);
            this.accountId = (0, uuid_1.v5)(accountIdBucket, AMPLIFY_CLI_UUID_NAMESPACE);
            return this.accountId;
          }
          return NO_ACCOUNT_ID;
        } catch {
          return NO_ACCOUNT_ID;
        }
      };
    };
    exports2.AccountIdFetcher = AccountIdFetcher;
  }
});

// node_modules/@aws-amplify/platform-core/lib/usage-data/get_installation_id.js
var require_get_installation_id = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/usage-data/get_installation_id.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getInstallationUuid = void 0;
    var uuid_1 = require_cjs2();
    var os_1 = require("os");
    var AMPLIFY_CLI_UUID_NAMESPACE = "e7368840-2eb6-4042-99b4-9d6c2a9370e6";
    var getInstallationUuid = (namespace = AMPLIFY_CLI_UUID_NAMESPACE) => {
      return (0, uuid_1.v5)(__dirname + (0, os_1.hostname)(), namespace);
    };
    exports2.getInstallationUuid = getInstallationUuid;
  }
});

// node_modules/@aws-amplify/platform-core/lib/usage-data/constants.js
var require_constants = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/usage-data/constants.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.USAGE_DATA_TRACKING_ENABLED = exports2.latestPayloadVersion = exports2.latestApiVersion = void 0;
    exports2.latestApiVersion = "v1.0";
    exports2.latestPayloadVersion = "1.1.0";
    exports2.USAGE_DATA_TRACKING_ENABLED = "telemetry.enabled";
  }
});

// node_modules/@aws-amplify/platform-core/lib/usage-data/get_usage_data_url.js
var require_get_usage_data_url = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/usage-data/get_usage_data_url.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getUrl = void 0;
    var node_url_1 = __importDefault(require("node:url"));
    var constants_js_1 = require_constants();
    var cachedUrl;
    var prodUrl = `https://api.cli.amplify.aws/${constants_js_1.latestApiVersion}/metrics`;
    var getUrl = () => {
      if (!cachedUrl) {
        cachedUrl = getParsedUrl();
      }
      return cachedUrl;
    };
    exports2.getUrl = getUrl;
    var getParsedUrl = () => {
      return node_url_1.default.parse(process.env.AMPLIFY_BACKEND_USAGE_TRACKING_ENDPOINT || prodUrl);
    };
  }
});

// node_modules/ci-info/vendors.json
var require_vendors = __commonJS({
  "node_modules/ci-info/vendors.json"(exports2, module2) {
    module2.exports = [
      {
        name: "Agola CI",
        constant: "AGOLA",
        env: "AGOLA_GIT_REF",
        pr: "AGOLA_PULL_REQUEST_ID"
      },
      {
        name: "Appcircle",
        constant: "APPCIRCLE",
        env: "AC_APPCIRCLE",
        pr: {
          env: "AC_GIT_PR",
          ne: "false"
        }
      },
      {
        name: "AppVeyor",
        constant: "APPVEYOR",
        env: "APPVEYOR",
        pr: "APPVEYOR_PULL_REQUEST_NUMBER"
      },
      {
        name: "AWS CodeBuild",
        constant: "CODEBUILD",
        env: "CODEBUILD_BUILD_ARN",
        pr: {
          env: "CODEBUILD_WEBHOOK_EVENT",
          any: [
            "PULL_REQUEST_CREATED",
            "PULL_REQUEST_UPDATED",
            "PULL_REQUEST_REOPENED"
          ]
        }
      },
      {
        name: "Azure Pipelines",
        constant: "AZURE_PIPELINES",
        env: "TF_BUILD",
        pr: {
          BUILD_REASON: "PullRequest"
        }
      },
      {
        name: "Bamboo",
        constant: "BAMBOO",
        env: "bamboo_planKey"
      },
      {
        name: "Bitbucket Pipelines",
        constant: "BITBUCKET",
        env: "BITBUCKET_COMMIT",
        pr: "BITBUCKET_PR_ID"
      },
      {
        name: "Bitrise",
        constant: "BITRISE",
        env: "BITRISE_IO",
        pr: "BITRISE_PULL_REQUEST"
      },
      {
        name: "Buddy",
        constant: "BUDDY",
        env: "BUDDY_WORKSPACE_ID",
        pr: "BUDDY_EXECUTION_PULL_REQUEST_ID"
      },
      {
        name: "Buildkite",
        constant: "BUILDKITE",
        env: "BUILDKITE",
        pr: {
          env: "BUILDKITE_PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "CircleCI",
        constant: "CIRCLE",
        env: "CIRCLECI",
        pr: "CIRCLE_PULL_REQUEST"
      },
      {
        name: "Cirrus CI",
        constant: "CIRRUS",
        env: "CIRRUS_CI",
        pr: "CIRRUS_PR"
      },
      {
        name: "Cloudflare Pages",
        constant: "CLOUDFLARE_PAGES",
        env: "CF_PAGES"
      },
      {
        name: "Cloudflare Workers",
        constant: "CLOUDFLARE_WORKERS",
        env: "WORKERS_CI"
      },
      {
        name: "Codefresh",
        constant: "CODEFRESH",
        env: "CF_BUILD_ID",
        pr: {
          any: [
            "CF_PULL_REQUEST_NUMBER",
            "CF_PULL_REQUEST_ID"
          ]
        }
      },
      {
        name: "Codemagic",
        constant: "CODEMAGIC",
        env: "CM_BUILD_ID",
        pr: "CM_PULL_REQUEST"
      },
      {
        name: "Codeship",
        constant: "CODESHIP",
        env: {
          CI_NAME: "codeship"
        }
      },
      {
        name: "Drone",
        constant: "DRONE",
        env: "DRONE",
        pr: {
          DRONE_BUILD_EVENT: "pull_request"
        }
      },
      {
        name: "dsari",
        constant: "DSARI",
        env: "DSARI"
      },
      {
        name: "Earthly",
        constant: "EARTHLY",
        env: "EARTHLY_CI"
      },
      {
        name: "Expo Application Services",
        constant: "EAS",
        env: "EAS_BUILD"
      },
      {
        name: "Gerrit",
        constant: "GERRIT",
        env: "GERRIT_PROJECT"
      },
      {
        name: "Gitea Actions",
        constant: "GITEA_ACTIONS",
        env: "GITEA_ACTIONS"
      },
      {
        name: "GitHub Actions",
        constant: "GITHUB_ACTIONS",
        env: "GITHUB_ACTIONS",
        pr: {
          GITHUB_EVENT_NAME: "pull_request"
        }
      },
      {
        name: "GitLab CI",
        constant: "GITLAB",
        env: "GITLAB_CI",
        pr: "CI_MERGE_REQUEST_ID"
      },
      {
        name: "GoCD",
        constant: "GOCD",
        env: "GO_PIPELINE_LABEL"
      },
      {
        name: "Google Cloud Build",
        constant: "GOOGLE_CLOUD_BUILD",
        env: "BUILDER_OUTPUT"
      },
      {
        name: "Harness CI",
        constant: "HARNESS",
        env: "HARNESS_BUILD_ID"
      },
      {
        name: "Heroku",
        constant: "HEROKU",
        env: {
          env: "NODE",
          includes: "/app/.heroku/node/bin/node"
        }
      },
      {
        name: "Hudson",
        constant: "HUDSON",
        env: "HUDSON_URL"
      },
      {
        name: "Jenkins",
        constant: "JENKINS",
        env: [
          "JENKINS_URL",
          "BUILD_ID"
        ],
        pr: {
          any: [
            "ghprbPullId",
            "CHANGE_ID"
          ]
        }
      },
      {
        name: "LayerCI",
        constant: "LAYERCI",
        env: "LAYERCI",
        pr: "LAYERCI_PULL_REQUEST"
      },
      {
        name: "Magnum CI",
        constant: "MAGNUM",
        env: "MAGNUM"
      },
      {
        name: "Netlify CI",
        constant: "NETLIFY",
        env: "NETLIFY",
        pr: {
          env: "PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "Nevercode",
        constant: "NEVERCODE",
        env: "NEVERCODE",
        pr: {
          env: "NEVERCODE_PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "Prow",
        constant: "PROW",
        env: "PROW_JOB_ID"
      },
      {
        name: "ReleaseHub",
        constant: "RELEASEHUB",
        env: "RELEASE_BUILD_ID"
      },
      {
        name: "Render",
        constant: "RENDER",
        env: "RENDER",
        pr: {
          IS_PULL_REQUEST: "true"
        }
      },
      {
        name: "Sail CI",
        constant: "SAIL",
        env: "SAILCI",
        pr: "SAIL_PULL_REQUEST_NUMBER"
      },
      {
        name: "Screwdriver",
        constant: "SCREWDRIVER",
        env: "SCREWDRIVER",
        pr: {
          env: "SD_PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "Semaphore",
        constant: "SEMAPHORE",
        env: "SEMAPHORE",
        pr: "PULL_REQUEST_NUMBER"
      },
      {
        name: "Sourcehut",
        constant: "SOURCEHUT",
        env: {
          CI_NAME: "sourcehut"
        }
      },
      {
        name: "Strider CD",
        constant: "STRIDER",
        env: "STRIDER"
      },
      {
        name: "TaskCluster",
        constant: "TASKCLUSTER",
        env: [
          "TASK_ID",
          "RUN_ID"
        ]
      },
      {
        name: "TeamCity",
        constant: "TEAMCITY",
        env: "TEAMCITY_VERSION"
      },
      {
        name: "Travis CI",
        constant: "TRAVIS",
        env: "TRAVIS",
        pr: {
          env: "TRAVIS_PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "Vela",
        constant: "VELA",
        env: "VELA",
        pr: {
          VELA_PULL_REQUEST: "1"
        }
      },
      {
        name: "Vercel",
        constant: "VERCEL",
        env: {
          any: [
            "NOW_BUILDER",
            "VERCEL"
          ]
        },
        pr: "VERCEL_GIT_PULL_REQUEST_ID"
      },
      {
        name: "Visual Studio App Center",
        constant: "APPCENTER",
        env: "APPCENTER_BUILD_ID"
      },
      {
        name: "Woodpecker",
        constant: "WOODPECKER",
        env: {
          CI: "woodpecker"
        },
        pr: {
          CI_BUILD_EVENT: "pull_request"
        }
      },
      {
        name: "Xcode Cloud",
        constant: "XCODE_CLOUD",
        env: "CI_XCODE_PROJECT",
        pr: "CI_PULL_REQUEST_NUMBER"
      },
      {
        name: "Xcode Server",
        constant: "XCODE_SERVER",
        env: "XCS"
      }
    ];
  }
});

// node_modules/ci-info/index.js
var require_ci_info = __commonJS({
  "node_modules/ci-info/index.js"(exports2) {
    "use strict";
    var vendors = require_vendors();
    var env = process.env;
    Object.defineProperty(exports2, "_vendors", {
      value: vendors.map(function(v) {
        return v.constant;
      })
    });
    exports2.name = null;
    exports2.isPR = null;
    exports2.id = null;
    if (env.CI !== "false") {
      vendors.forEach(function(vendor) {
        const envs = Array.isArray(vendor.env) ? vendor.env : [vendor.env];
        const isCI = envs.every(function(obj) {
          return checkEnv(obj);
        });
        exports2[vendor.constant] = isCI;
        if (!isCI) {
          return;
        }
        exports2.name = vendor.name;
        exports2.isPR = checkPR(vendor);
        exports2.id = vendor.constant;
      });
    }
    exports2.isCI = !!(env.CI !== "false" && // Bypass all checks if CI env is explicitly set to 'false'
    (env.BUILD_ID || // Jenkins, Cloudbees
    env.BUILD_NUMBER || // Jenkins, TeamCity
    env.CI || // Travis CI, CircleCI, Cirrus CI, Gitlab CI, Appveyor, CodeShip, dsari, Cloudflare Pages/Workers
    env.CI_APP_ID || // Appflow
    env.CI_BUILD_ID || // Appflow
    env.CI_BUILD_NUMBER || // Appflow
    env.CI_NAME || // Codeship and others
    env.CONTINUOUS_INTEGRATION || // Travis CI, Cirrus CI
    env.RUN_ID || // TaskCluster, dsari
    exports2.name || false));
    function checkEnv(obj) {
      if (typeof obj === "string") return !!env[obj];
      if ("env" in obj) {
        return env[obj.env] && env[obj.env].includes(obj.includes);
      }
      if ("any" in obj) {
        return obj.any.some(function(k) {
          return !!env[k];
        });
      }
      return Object.keys(obj).every(function(k) {
        return env[k] === obj[k];
      });
    }
    function checkPR(vendor) {
      switch (typeof vendor.pr) {
        case "string":
          return !!env[vendor.pr];
        case "object":
          if ("env" in vendor.pr) {
            if ("any" in vendor.pr) {
              return vendor.pr.any.some(function(key) {
                return env[vendor.pr.env] === key;
              });
            } else {
              return vendor.pr.env in env && env[vendor.pr.env] !== vendor.pr.ne;
            }
          } else if ("any" in vendor.pr) {
            return vendor.pr.any.some(function(key) {
              return !!env[key];
            });
          } else {
            return checkEnv(vendor.pr);
          }
        default:
          return null;
      }
    }
  }
});

// node_modules/is-ci/index.js
var require_is_ci = __commonJS({
  "node_modules/is-ci/index.js"(exports2, module2) {
    "use strict";
    module2.exports = require_ci_info().isCI;
  }
});

// node_modules/@aws-amplify/platform-core/lib/usage-data/serializable_error.js
var require_serializable_error = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/usage-data/serializable_error.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SerializableError = void 0;
    var path_1 = __importDefault(require("path"));
    var url_1 = require("url");
    var os_1 = require("os");
    var SerializableError = class {
      name;
      message;
      details;
      trace;
      // breakdown of filePathRegex:
      // (file:/+)? -> matches optional file url prefix
      // homedir()/process.cwd() -> users home directory or current working directory, replacing \ with /
      // [\\w.\\-_@\\\\/]+ -> matches nested directories and file name
      filePathRegex = new RegExp(`(file:/+)?(${(0, os_1.homedir)().replaceAll("\\", "/")}|${process.cwd().replaceAll("\\", "/")})[\\w.\\-_@\\\\/]+`, "g");
      stackTraceRegex = /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;
      arnRegex = /arn:[a-z0-9][-.a-z0-9]{0,62}:[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,1023}/g;
      stackRegex = /amplify-[a-zA-Z0-9-]+/g;
      /**
       * constructor for SerializableError
       */
      constructor(error) {
        this.name = "code" in error && error.code ? this.sanitize(error.code) : error.name;
        this.message = this.anonymizePaths(this.sanitize(error.message));
        this.details = "details" in error ? this.anonymizePaths(this.sanitize(error.details)) : void 0;
        this.trace = this.extractStackTrace(error);
      }
      extractStackTrace = (error) => {
        const result = [];
        if (error.stack) {
          const stack = error.stack.split("\n");
          stack.forEach((line) => {
            const match = this.stackTraceRegex.exec(line);
            if (match) {
              const [, methodName, file, lineNumber, columnNumber] = match;
              result.push({
                methodName,
                file,
                lineNumber,
                columnNumber
              });
            }
          });
          const processedPaths = this.processPaths(result.map((trace2) => trace2.file));
          result.forEach((trace2, index) => {
            trace2.file = processedPaths[index];
          });
        }
        return result;
      };
      anonymizePaths = (str) => {
        let result = str;
        const matches = [...result.matchAll(this.filePathRegex)];
        for (const match of matches) {
          result = result.replace(match[0], this.processPaths([match[0]])[0]);
        }
        return result;
      };
      processPaths = (paths) => {
        return paths.map((tracePath) => {
          let result = tracePath;
          if (this.isURLFilePath(result)) {
            result = (0, url_1.fileURLToPath)(result);
          }
          if (path_1.default.isAbsolute(result)) {
            return path_1.default.relative(process.cwd(), result);
          }
          return result;
        });
      };
      removeARN = (str) => {
        return str?.replace(this.arnRegex, "<escaped ARN>") ?? "";
      };
      removeStackIdentifier = (str) => {
        return str?.replace(this.stackRegex, "<escaped stack>") ?? "";
      };
      sanitize = (str) => {
        let result = str;
        result = this.removeARN(result);
        result = this.removeStackIdentifier(result);
        return result.replaceAll(/["❌]/g, "");
      };
      isURLFilePath = (path) => {
        try {
          new URL(path);
          return path.startsWith("file:");
        } catch {
          return false;
        }
      };
    };
    exports2.SerializableError = SerializableError;
  }
});

// node_modules/@aws-amplify/platform-core/lib/usage-data/usage_data_emitter.js
var require_usage_data_emitter = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/usage-data/usage_data_emitter.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DefaultUsageDataEmitter = void 0;
    var uuid_1 = require_cjs2();
    var account_id_fetcher_js_1 = require_account_id_fetcher();
    var os_1 = __importDefault(require("os"));
    var https_1 = __importDefault(require("https"));
    var get_installation_id_js_1 = require_get_installation_id();
    var constants_js_1 = require_constants();
    var get_usage_data_url_js_1 = require_get_usage_data_url();
    var is_ci_1 = __importDefault(require_is_ci());
    var serializable_error_js_1 = require_serializable_error();
    var DefaultUsageDataEmitter = class {
      libraryVersion;
      dependencies;
      sessionUuid;
      url;
      accountIdFetcher;
      dependenciesToReport;
      /**
       * Constructor for UsageDataEmitter
       */
      constructor(libraryVersion, dependencies, sessionUuid = (0, uuid_1.v4)(), url = (0, get_usage_data_url_js_1.getUrl)(), accountIdFetcher = new account_id_fetcher_js_1.AccountIdFetcher()) {
        this.libraryVersion = libraryVersion;
        this.dependencies = dependencies;
        this.sessionUuid = sessionUuid;
        this.url = url;
        this.accountIdFetcher = accountIdFetcher;
        const targetDependencies = ["@aws-cdk/toolkit-lib", "aws-cdk-lib"];
        this.dependenciesToReport = this.dependencies?.filter((dependency) => targetDependencies.includes(dependency.name));
      }
      emitSuccess = async (metrics2, dimensions) => {
        try {
          const data = await this.getUsageData({
            state: "SUCCEEDED",
            metrics: metrics2,
            dimensions
          });
          await this.send(data);
        } catch {
        }
      };
      emitFailure = async (error, dimensions) => {
        try {
          const data = await this.getUsageData({
            state: "FAILED",
            error,
            dimensions
          });
          await this.send(data);
        } catch {
        }
      };
      getUsageData = async (options) => {
        return {
          accountId: await this.accountIdFetcher.fetch(),
          sessionUuid: this.sessionUuid,
          installationUuid: (0, get_installation_id_js_1.getInstallationUuid)(),
          amplifyCliVersion: this.libraryVersion,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          error: options.error ? new serializable_error_js_1.SerializableError(options.error) : void 0,
          downstreamException: options.error && options.error.cause && options.error.cause instanceof Error ? new serializable_error_js_1.SerializableError(options.error.cause) : void 0,
          payloadVersion: constants_js_1.latestPayloadVersion,
          osPlatform: os_1.default.platform(),
          osRelease: os_1.default.release(),
          nodeVersion: process.versions.node,
          state: options.state,
          codePathDurations: this.translateMetricsToUsageData(options.metrics),
          input: this.translateDimensionsToUsageData(options.dimensions),
          isCi: is_ci_1.default,
          projectSetting: {
            editor: process.env.npm_config_user_agent,
            details: JSON.stringify(this.dependenciesToReport)
          }
        };
      };
      send = (data) => {
        return new Promise((resolve) => {
          const payload = JSON.stringify(data);
          const req = https_1.default.request({
            hostname: this.url.hostname,
            port: this.url.port,
            path: this.url.path,
            method: "POST",
            headers: {
              "content-type": "application/json",
              "content-length": payload.length
            }
          });
          req.on("error", () => {
          });
          req.setTimeout(2e3, () => {
            resolve();
          });
          req.write(payload);
          req.end(() => {
            resolve();
          });
        });
      };
      translateMetricsToUsageData = (metrics2) => {
        if (!metrics2)
          return {};
        let totalDuration, platformStartup;
        for (const [name, data] of Object.entries(metrics2)) {
          if (name === "totalTime") {
            totalDuration = Math.round(data);
          } else if (name === "synthesisTime") {
            platformStartup = Math.round(data);
          }
        }
        return { totalDuration, platformStartup };
      };
      translateDimensionsToUsageData = (dimensions) => {
        let command = "";
        if (dimensions) {
          for (const [name, data] of Object.entries(dimensions)) {
            if (name === "command") {
              command = data;
            }
          }
        }
        return { command, plugin: "Gen2" };
      };
    };
    exports2.DefaultUsageDataEmitter = DefaultUsageDataEmitter;
  }
});

// node_modules/@aws-amplify/platform-core/lib/usage-data/usage_data_emitter_factory.js
var require_usage_data_emitter_factory = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/usage-data/usage_data_emitter_factory.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.UsageDataEmitterFactory = void 0;
    var local_configuration_controller_factory_js_1 = require_local_configuration_controller_factory();
    var noop_usage_data_emitter_js_1 = require_noop_usage_data_emitter();
    var usage_data_emitter_js_1 = require_usage_data_emitter();
    var constants_js_1 = require_constants();
    var UsageDataEmitterFactory = class {
      /**
       * Creates UsageDataEmitter for a given library version, usage data tracking preferences
       */
      getInstance = async (libraryVersion, dependencies) => {
        const configController = local_configuration_controller_factory_js_1.configControllerFactory.getInstance("usage_data_preferences.json");
        const usageDataTrackingDisabledLocalFile = await configController.get(constants_js_1.USAGE_DATA_TRACKING_ENABLED) === false;
        if (process.env.AMPLIFY_DISABLE_TELEMETRY || usageDataTrackingDisabledLocalFile) {
          return new noop_usage_data_emitter_js_1.NoOpUsageDataEmitter();
        }
        return new usage_data_emitter_js_1.DefaultUsageDataEmitter(libraryVersion, dependencies);
      };
    };
    exports2.UsageDataEmitterFactory = UsageDataEmitterFactory;
  }
});

// node_modules/@aws-amplify/platform-core/lib/config/typed_configuration_file.js
var require_typed_configuration_file = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/config/typed_configuration_file.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ZodSchemaTypedConfigurationFile = void 0;
    var get_config_dir_path_1 = require_get_config_dir_path();
    var path_1 = __importDefault(require("path"));
    var promises_1 = __importDefault(require("fs/promises"));
    var fs_1 = require("fs");
    var ZodSchemaTypedConfigurationFile = class {
      schema;
      defaultValue;
      _fsp;
      _existsSync;
      filePath;
      data;
      /**
       * Creates configuration file with content validation.
       */
      constructor(schema, fileName, defaultValue, _fsp = promises_1.default, _existsSync = fs_1.existsSync) {
        this.schema = schema;
        this.defaultValue = defaultValue;
        this._fsp = _fsp;
        this._existsSync = _existsSync;
        this.filePath = path_1.default.join((0, get_config_dir_path_1.getConfigDirPath)(), fileName);
      }
      read = async () => {
        if (!this.data) {
          if (this._existsSync(this.filePath)) {
            const fileContent = await this._fsp.readFile(this.filePath, "utf-8");
            try {
              const jsonParsedContent = JSON.parse(fileContent);
              this.data = this.schema.parse(jsonParsedContent);
            } catch {
              this.data = this.schema.parse(this.defaultValue);
            }
          } else {
            this.data = this.schema.parse(this.defaultValue);
          }
        }
        return this.schema.parse(this.data);
      };
      write = async (data) => {
        await this._fsp.writeFile(this.filePath, JSON.stringify(data, null, 2));
        this.data = data;
      };
      delete = async () => {
        if (this._existsSync(this.filePath)) {
          await this._fsp.unlink(this.filePath);
        }
        this.data = void 0;
      };
    };
    exports2.ZodSchemaTypedConfigurationFile = ZodSchemaTypedConfigurationFile;
  }
});

// node_modules/@aws-amplify/platform-core/lib/config/typed_configuration_file_factory.js
var require_typed_configuration_file_factory = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/config/typed_configuration_file_factory.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.typedConfigurationFileFactory = exports2.TypedConfigurationFileFactory = void 0;
    var typed_configuration_file_1 = require_typed_configuration_file();
    var TypedConfigurationFileFactory = class {
      files;
      /**
       * initialized empty map of TypedConfigurationFile;
       */
      constructor() {
        this.files = {};
      }
      /**
       * Returns a TypedConfigurationFile
       */
      getInstance = (fileName, schema, defaultValue) => {
        if (this.files[fileName]) {
          return this.files[fileName];
        }
        this.files[fileName] = new typed_configuration_file_1.ZodSchemaTypedConfigurationFile(schema, fileName, defaultValue);
        return this.files[fileName];
      };
    };
    exports2.TypedConfigurationFileFactory = TypedConfigurationFileFactory;
    exports2.typedConfigurationFileFactory = new TypedConfigurationFileFactory();
  }
});

// node_modules/@aws-amplify/platform-core/lib/cdk_context_key.js
var require_cdk_context_key = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/cdk_context_key.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CDKContextKey = void 0;
    var CDKContextKey;
    (function(CDKContextKey2) {
      CDKContextKey2["BACKEND_NAME"] = "amplify-backend-name";
      CDKContextKey2["BACKEND_NAMESPACE"] = "amplify-backend-namespace";
      CDKContextKey2["DEPLOYMENT_TYPE"] = "amplify-backend-type";
    })(CDKContextKey || (exports2.CDKContextKey = CDKContextKey = {}));
  }
});

// node_modules/@aws-amplify/platform-core/lib/parameter_path_conversions.js
var require_parameter_path_conversions = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/parameter_path_conversions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ParameterPathConversions = void 0;
    var backend_identifier_conversions_js_1 = require_backend_identifier_conversions();
    var errors_1 = require_errors();
    var SHARED_SECRET = "shared";
    var RESOURCE_REFERENCE = "resource_reference";
    var ParameterPathConversions2 = class {
      /**
       * Convert a BackendIdentifier to a parameter prefix.
       */
      // It's fine to ignore the rule here because the anti-static rule is to ban the static function which should use constructor
      // eslint-disable-next-line no-restricted-syntax
      static toParameterPrefix(backendId) {
        if (typeof backendId === "object") {
          return getBackendParameterPrefix(backendId);
        }
        return getSharedParameterPrefix(backendId);
      }
      /**
       * Convert a BackendIdentifier to a parameter full path.
       */
      // It's fine to ignore the rule here because the anti-static rule is to ban the static function which should use constructor
      // eslint-disable-next-line no-restricted-syntax
      static toParameterFullPath(backendId, parameterName) {
        if (typeof backendId === "object") {
          return getBackendParameterFullPath(backendId, parameterName);
        }
        return getSharedParameterFullPath(backendId, parameterName);
      }
      /**
       * Generate an SSM path for references to other backend resources
       */
      // It's fine to ignore the rule here because the anti-static rule is to ban the static function which should use constructor
      // eslint-disable-next-line no-restricted-syntax
      static toResourceReferenceFullPath(backendId, referenceName) {
        return `/amplify/${RESOURCE_REFERENCE}/${getBackendIdentifierPathPart(backendId)}/${referenceName}`;
      }
    };
    exports2.ParameterPathConversions = ParameterPathConversions2;
    var getBackendParameterPrefix = (parts) => {
      return `/amplify/${getBackendIdentifierPathPart(parts)}`;
    };
    var getBackendIdentifierPathPart = (parts) => {
      const sanitizedBackendId = backend_identifier_conversions_js_1.BackendIdentifierConversions.fromStackName(backend_identifier_conversions_js_1.BackendIdentifierConversions.toStackName(parts));
      if (!sanitizedBackendId || !sanitizedBackendId.hash) {
        throw new errors_1.AmplifyFault("BackendIdConversionFault", {
          message: `Could not sanitize the backendId to construct the parameter path`
        });
      }
      return `${sanitizedBackendId.namespace}/${sanitizedBackendId.name}-${sanitizedBackendId.type}-${sanitizedBackendId.hash}`;
    };
    var getBackendParameterFullPath = (backendIdentifier, parameterName) => {
      return `${getBackendParameterPrefix(backendIdentifier)}/${parameterName}`;
    };
    var getSharedParameterPrefix = (appId) => {
      return `/amplify/${SHARED_SECRET}/${appId}`;
    };
    var getSharedParameterFullPath = (appId, parameterName) => {
      return `${getSharedParameterPrefix(appId)}/${parameterName}`;
    };
  }
});

// node_modules/lodash.mergewith/index.js
var require_lodash = __commonJS({
  "node_modules/lodash.mergewith/index.js"(exports2, module2) {
    var LARGE_ARRAY_SIZE = 200;
    var HASH_UNDEFINED = "__lodash_hash_undefined__";
    var HOT_COUNT = 800;
    var HOT_SPAN = 16;
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var arrayTag = "[object Array]";
    var asyncTag = "[object AsyncFunction]";
    var boolTag = "[object Boolean]";
    var dateTag = "[object Date]";
    var errorTag = "[object Error]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var mapTag = "[object Map]";
    var numberTag = "[object Number]";
    var nullTag = "[object Null]";
    var objectTag = "[object Object]";
    var proxyTag = "[object Proxy]";
    var regexpTag = "[object RegExp]";
    var setTag = "[object Set]";
    var stringTag = "[object String]";
    var undefinedTag = "[object Undefined]";
    var weakMapTag = "[object WeakMap]";
    var arrayBufferTag = "[object ArrayBuffer]";
    var dataViewTag = "[object DataView]";
    var float32Tag = "[object Float32Array]";
    var float64Tag = "[object Float64Array]";
    var int8Tag = "[object Int8Array]";
    var int16Tag = "[object Int16Array]";
    var int32Tag = "[object Int32Array]";
    var uint8Tag = "[object Uint8Array]";
    var uint8ClampedTag = "[object Uint8ClampedArray]";
    var uint16Tag = "[object Uint16Array]";
    var uint32Tag = "[object Uint32Array]";
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reIsHostCtor = /^\[object .+?Constructor\]$/;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
    var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    var freeExports = typeof exports2 == "object" && exports2 && !exports2.nodeType && exports2;
    var freeModule = freeExports && typeof module2 == "object" && module2 && !module2.nodeType && module2;
    var moduleExports = freeModule && freeModule.exports === freeExports;
    var freeProcess = moduleExports && freeGlobal.process;
    var nodeUtil = (function() {
      try {
        var types = freeModule && freeModule.require && freeModule.require("util").types;
        if (types) {
          return types;
        }
        return freeProcess && freeProcess.binding && freeProcess.binding("util");
      } catch (e) {
      }
    })();
    var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
    function apply(func, thisArg, args) {
      switch (args.length) {
        case 0:
          return func.call(thisArg);
        case 1:
          return func.call(thisArg, args[0]);
        case 2:
          return func.call(thisArg, args[0], args[1]);
        case 3:
          return func.call(thisArg, args[0], args[1], args[2]);
      }
      return func.apply(thisArg, args);
    }
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    function baseUnary(func) {
      return function(value) {
        return func(value);
      };
    }
    function getValue(object, key) {
      return object == null ? void 0 : object[key];
    }
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    var arrayProto = Array.prototype;
    var funcProto = Function.prototype;
    var objectProto = Object.prototype;
    var coreJsData = root["__core-js_shared__"];
    var funcToString = funcProto.toString;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
      return uid ? "Symbol(src)_1." + uid : "";
    })();
    var nativeObjectToString = objectProto.toString;
    var objectCtorString = funcToString.call(Object);
    var reIsNative = RegExp(
      "^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    );
    var Buffer2 = moduleExports ? root.Buffer : void 0;
    var Symbol2 = root.Symbol;
    var Uint8Array2 = root.Uint8Array;
    var allocUnsafe = Buffer2 ? Buffer2.allocUnsafe : void 0;
    var getPrototype = overArg(Object.getPrototypeOf, Object);
    var objectCreate = Object.create;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var splice = arrayProto.splice;
    var symToStringTag = Symbol2 ? Symbol2.toStringTag : void 0;
    var defineProperty = (function() {
      try {
        var func = getNative(Object, "defineProperty");
        func({}, "", {});
        return func;
      } catch (e) {
      }
    })();
    var nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : void 0;
    var nativeMax = Math.max;
    var nativeNow = Date.now;
    var Map2 = getNative(root, "Map");
    var nativeCreate = getNative(Object, "create");
    var baseCreate = /* @__PURE__ */ (function() {
      function object() {
      }
      return function(proto) {
        if (!isObject(proto)) {
          return {};
        }
        if (objectCreate) {
          return objectCreate(proto);
        }
        object.prototype = proto;
        var result = new object();
        object.prototype = void 0;
        return result;
      };
    })();
    function Hash(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
      this.size = 0;
    }
    function hashDelete(key) {
      var result = this.has(key) && delete this.__data__[key];
      this.size -= result ? 1 : 0;
      return result;
    }
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? void 0 : result;
      }
      return hasOwnProperty.call(data, key) ? data[key] : void 0;
    }
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? data[key] !== void 0 : hasOwnProperty.call(data, key);
    }
    function hashSet(key, value) {
      var data = this.__data__;
      this.size += this.has(key) ? 0 : 1;
      data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
      return this;
    }
    Hash.prototype.clear = hashClear;
    Hash.prototype["delete"] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;
    function ListCache(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function listCacheClear() {
      this.__data__ = [];
      this.size = 0;
    }
    function listCacheDelete(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      --this.size;
      return true;
    }
    function listCacheGet(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      return index < 0 ? void 0 : data[index][1];
    }
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }
    function listCacheSet(key, value) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        ++this.size;
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype["delete"] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;
    function MapCache(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function mapCacheClear() {
      this.size = 0;
      this.__data__ = {
        "hash": new Hash(),
        "map": new (Map2 || ListCache)(),
        "string": new Hash()
      };
    }
    function mapCacheDelete(key) {
      var result = getMapData(this, key)["delete"](key);
      this.size -= result ? 1 : 0;
      return result;
    }
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }
    function mapCacheSet(key, value) {
      var data = getMapData(this, key), size = data.size;
      data.set(key, value);
      this.size += data.size == size ? 0 : 1;
      return this;
    }
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype["delete"] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;
    function Stack(entries) {
      var data = this.__data__ = new ListCache(entries);
      this.size = data.size;
    }
    function stackClear() {
      this.__data__ = new ListCache();
      this.size = 0;
    }
    function stackDelete(key) {
      var data = this.__data__, result = data["delete"](key);
      this.size = data.size;
      return result;
    }
    function stackGet(key) {
      return this.__data__.get(key);
    }
    function stackHas(key) {
      return this.__data__.has(key);
    }
    function stackSet(key, value) {
      var data = this.__data__;
      if (data instanceof ListCache) {
        var pairs = data.__data__;
        if (!Map2 || pairs.length < LARGE_ARRAY_SIZE - 1) {
          pairs.push([key, value]);
          this.size = ++data.size;
          return this;
        }
        data = this.__data__ = new MapCache(pairs);
      }
      data.set(key, value);
      this.size = data.size;
      return this;
    }
    Stack.prototype.clear = stackClear;
    Stack.prototype["delete"] = stackDelete;
    Stack.prototype.get = stackGet;
    Stack.prototype.has = stackHas;
    Stack.prototype.set = stackSet;
    function arrayLikeKeys(value, inherited) {
      var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result = skipIndexes ? baseTimes(value.length, String) : [], length = result.length;
      for (var key in value) {
        if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
        (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
        isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
        isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
        isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    function assignMergeValue(object, key, value) {
      if (value !== void 0 && !eq(object[key], value) || value === void 0 && !(key in object)) {
        baseAssignValue(object, key, value);
      }
    }
    function assignValue(object, key, value) {
      var objValue = object[key];
      if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) || value === void 0 && !(key in object)) {
        baseAssignValue(object, key, value);
      }
    }
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }
    function baseAssignValue(object, key, value) {
      if (key == "__proto__" && defineProperty) {
        defineProperty(object, key, {
          "configurable": true,
          "enumerable": true,
          "value": value,
          "writable": true
        });
      } else {
        object[key] = value;
      }
    }
    var baseFor = createBaseFor();
    function baseGetTag(value) {
      if (value == null) {
        return value === void 0 ? undefinedTag : nullTag;
      }
      return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
    }
    function baseIsArguments(value) {
      return isObjectLike(value) && baseGetTag(value) == argsTag;
    }
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }
    function baseIsTypedArray(value) {
      return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
    }
    function baseKeysIn(object) {
      if (!isObject(object)) {
        return nativeKeysIn(object);
      }
      var isProto = isPrototype(object), result = [];
      for (var key in object) {
        if (!(key == "constructor" && (isProto || !hasOwnProperty.call(object, key)))) {
          result.push(key);
        }
      }
      return result;
    }
    function baseMerge(object, source, srcIndex, customizer, stack) {
      if (object === source) {
        return;
      }
      baseFor(source, function(srcValue, key) {
        stack || (stack = new Stack());
        if (isObject(srcValue)) {
          baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
        } else {
          var newValue = customizer ? customizer(safeGet(object, key), srcValue, key + "", object, source, stack) : void 0;
          if (newValue === void 0) {
            newValue = srcValue;
          }
          assignMergeValue(object, key, newValue);
        }
      }, keysIn);
    }
    function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
      var objValue = safeGet(object, key), srcValue = safeGet(source, key), stacked = stack.get(srcValue);
      if (stacked) {
        assignMergeValue(object, key, stacked);
        return;
      }
      var newValue = customizer ? customizer(objValue, srcValue, key + "", object, source, stack) : void 0;
      var isCommon = newValue === void 0;
      if (isCommon) {
        var isArr = isArray(srcValue), isBuff = !isArr && isBuffer(srcValue), isTyped = !isArr && !isBuff && isTypedArray(srcValue);
        newValue = srcValue;
        if (isArr || isBuff || isTyped) {
          if (isArray(objValue)) {
            newValue = objValue;
          } else if (isArrayLikeObject(objValue)) {
            newValue = copyArray(objValue);
          } else if (isBuff) {
            isCommon = false;
            newValue = cloneBuffer(srcValue, true);
          } else if (isTyped) {
            isCommon = false;
            newValue = cloneTypedArray(srcValue, true);
          } else {
            newValue = [];
          }
        } else if (isPlainObject(srcValue) || isArguments(srcValue)) {
          newValue = objValue;
          if (isArguments(objValue)) {
            newValue = toPlainObject(objValue);
          } else if (!isObject(objValue) || isFunction(objValue)) {
            newValue = initCloneObject(srcValue);
          }
        } else {
          isCommon = false;
        }
      }
      if (isCommon) {
        stack.set(srcValue, newValue);
        mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
        stack["delete"](srcValue);
      }
      assignMergeValue(object, key, newValue);
    }
    function baseRest(func, start) {
      return setToString(overRest(func, start, identity), func + "");
    }
    var baseSetToString = !defineProperty ? identity : function(func, string) {
      return defineProperty(func, "toString", {
        "configurable": true,
        "enumerable": false,
        "value": constant(string),
        "writable": true
      });
    };
    function cloneBuffer(buffer, isDeep) {
      if (isDeep) {
        return buffer.slice();
      }
      var length = buffer.length, result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);
      buffer.copy(result);
      return result;
    }
    function cloneArrayBuffer(arrayBuffer) {
      var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
      new Uint8Array2(result).set(new Uint8Array2(arrayBuffer));
      return result;
    }
    function cloneTypedArray(typedArray, isDeep) {
      var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
      return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
    }
    function copyArray(source, array) {
      var index = -1, length = source.length;
      array || (array = Array(length));
      while (++index < length) {
        array[index] = source[index];
      }
      return array;
    }
    function copyObject(source, props, object, customizer) {
      var isNew = !object;
      object || (object = {});
      var index = -1, length = props.length;
      while (++index < length) {
        var key = props[index];
        var newValue = customizer ? customizer(object[key], source[key], key, object, source) : void 0;
        if (newValue === void 0) {
          newValue = source[key];
        }
        if (isNew) {
          baseAssignValue(object, key, newValue);
        } else {
          assignValue(object, key, newValue);
        }
      }
      return object;
    }
    function createAssigner(assigner) {
      return baseRest(function(object, sources) {
        var index = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : void 0, guard = length > 2 ? sources[2] : void 0;
        customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : void 0;
        if (guard && isIterateeCall(sources[0], sources[1], guard)) {
          customizer = length < 3 ? void 0 : customizer;
          length = 1;
        }
        object = Object(object);
        while (++index < length) {
          var source = sources[index];
          if (source) {
            assigner(object, source, index, customizer);
          }
        }
        return object;
      });
    }
    function createBaseFor(fromRight) {
      return function(object, iteratee, keysFunc) {
        var index = -1, iterable = Object(object), props = keysFunc(object), length = props.length;
        while (length--) {
          var key = props[fromRight ? length : ++index];
          if (iteratee(iterable[key], key, iterable) === false) {
            break;
          }
        }
        return object;
      };
    }
    function getMapData(map, key) {
      var data = map.__data__;
      return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
    }
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : void 0;
    }
    function getRawTag(value) {
      var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
      try {
        value[symToStringTag] = void 0;
        var unmasked = true;
      } catch (e) {
      }
      var result = nativeObjectToString.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag] = tag;
        } else {
          delete value[symToStringTag];
        }
      }
      return result;
    }
    function initCloneObject(object) {
      return typeof object.constructor == "function" && !isPrototype(object) ? baseCreate(getPrototype(object)) : {};
    }
    function isIndex(value, length) {
      var type = typeof value;
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isIterateeCall(value, index, object) {
      if (!isObject(object)) {
        return false;
      }
      var type = typeof index;
      if (type == "number" ? isArrayLike(object) && isIndex(index, object.length) : type == "string" && index in object) {
        return eq(object[index], value);
      }
      return false;
    }
    function isKeyable(value) {
      var type = typeof value;
      return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
    }
    function isMasked(func) {
      return !!maskSrcKey && maskSrcKey in func;
    }
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    function nativeKeysIn(object) {
      var result = [];
      if (object != null) {
        for (var key in Object(object)) {
          result.push(key);
        }
      }
      return result;
    }
    function objectToString(value) {
      return nativeObjectToString.call(value);
    }
    function overRest(func, start, transform) {
      start = nativeMax(start === void 0 ? func.length - 1 : start, 0);
      return function() {
        var args = arguments, index = -1, length = nativeMax(args.length - start, 0), array = Array(length);
        while (++index < length) {
          array[index] = args[start + index];
        }
        index = -1;
        var otherArgs = Array(start + 1);
        while (++index < start) {
          otherArgs[index] = args[index];
        }
        otherArgs[start] = transform(array);
        return apply(func, this, otherArgs);
      };
    }
    function safeGet(object, key) {
      if (key === "constructor" && typeof object[key] === "function") {
        return;
      }
      if (key == "__proto__") {
        return;
      }
      return object[key];
    }
    var setToString = shortOut(baseSetToString);
    function shortOut(func) {
      var count = 0, lastCalled = 0;
      return function() {
        var stamp = nativeNow(), remaining = HOT_SPAN - (stamp - lastCalled);
        lastCalled = stamp;
        if (remaining > 0) {
          if (++count >= HOT_COUNT) {
            return arguments[0];
          }
        } else {
          count = 0;
        }
        return func.apply(void 0, arguments);
      };
    }
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {
        }
        try {
          return func + "";
        } catch (e) {
        }
      }
      return "";
    }
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    var isArguments = baseIsArguments(/* @__PURE__ */ (function() {
      return arguments;
    })()) ? baseIsArguments : function(value) {
      return isObjectLike(value) && hasOwnProperty.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
    };
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    function isArrayLikeObject(value) {
      return isObjectLike(value) && isArrayLike(value);
    }
    var isBuffer = nativeIsBuffer || stubFalse;
    function isFunction(value) {
      if (!isObject(value)) {
        return false;
      }
      var tag = baseGetTag(value);
      return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return value != null && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return value != null && typeof value == "object";
    }
    function isPlainObject(value) {
      if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
        return false;
      }
      var proto = getPrototype(value);
      if (proto === null) {
        return true;
      }
      var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
      return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
    }
    var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
    function toPlainObject(value) {
      return copyObject(value, keysIn(value));
    }
    function keysIn(object) {
      return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
    }
    var mergeWith = createAssigner(function(object, source, srcIndex, customizer) {
      baseMerge(object, source, srcIndex, customizer);
    });
    function constant(value) {
      return function() {
        return value;
      };
    }
    function identity(value) {
      return value;
    }
    function stubFalse() {
      return false;
    }
    module2.exports = mergeWith;
  }
});

// node_modules/semver/internal/constants.js
var require_constants2 = __commonJS({
  "node_modules/semver/internal/constants.js"(exports2, module2) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module2.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/semver/internal/debug.js"(exports2, module2) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module2.exports = debug;
  }
});

// node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/semver/internal/re.js"(exports2, module2) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants2();
    var debug = require_debug();
    exports2 = module2.exports = {};
    var re2 = exports2.re = [];
    var safeRe = exports2.safeRe = [];
    var src = exports2.src = [];
    var safeSrc = exports2.safeSrc = [];
    var t = exports2.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re2[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports2.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports2.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports2.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/semver/internal/parse-options.js"(exports2, module2) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    };
    module2.exports = parseOptions;
  }
});

// node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/semver/internal/identifiers.js"(exports2, module2) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module2.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/semver/classes/semver.js"(exports2, module2) {
    "use strict";
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants2();
    var { safeRe: re2, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var SemVer = class _SemVer {
      constructor(version, options) {
        options = parseOptions(options);
        if (version instanceof _SemVer) {
          if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version.trim().match(options.loose ? re2[t.LOOSE] : re2[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re2[t.PRERELEASELOOSE] : re2[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
                if (isNaN(this.prerelease[1])) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module2.exports = SemVer;
  }
});

// node_modules/semver/functions/parse.js
var require_parse2 = __commonJS({
  "node_modules/semver/functions/parse.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = (version, options, throwErrors = false) => {
      if (version instanceof SemVer) {
        return version;
      }
      try {
        return new SemVer(version, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    };
    module2.exports = parse;
  }
});

// node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/semver/functions/valid.js"(exports2, module2) {
    "use strict";
    var parse = require_parse2();
    var valid = (version, options) => {
      const v = parse(version, options);
      return v ? v.version : null;
    };
    module2.exports = valid;
  }
});

// node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/semver/functions/clean.js"(exports2, module2) {
    "use strict";
    var parse = require_parse2();
    var clean = (version, options) => {
      const s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    };
    module2.exports = clean;
  }
});

// node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/semver/functions/inc.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var inc = (version, release, options, identifier, identifierBase) => {
      if (typeof options === "string") {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options
        ).inc(release, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    };
    module2.exports = inc;
  }
});

// node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/semver/functions/diff.js"(exports2, module2) {
    "use strict";
    var parse = require_parse2();
    var diff = (version1, version2) => {
      const v1 = parse(version1, null, true);
      const v2 = parse(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return "minor";
          }
          return "patch";
        }
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    };
    module2.exports = diff;
  }
});

// node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/semver/functions/major.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var major2 = (a, loose) => new SemVer(a, loose).major;
    module2.exports = major2;
  }
});

// node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/semver/functions/minor.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var minor = (a, loose) => new SemVer(a, loose).minor;
    module2.exports = minor;
  }
});

// node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/semver/functions/patch.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var patch = (a, loose) => new SemVer(a, loose).patch;
    module2.exports = patch;
  }
});

// node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/semver/functions/prerelease.js"(exports2, module2) {
    "use strict";
    var parse = require_parse2();
    var prerelease = (version, options) => {
      const parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module2.exports = prerelease;
  }
});

// node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/semver/functions/compare.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module2.exports = compare;
  }
});

// node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/semver/functions/rcompare.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var rcompare = (a, b, loose) => compare(b, a, loose);
    module2.exports = rcompare;
  }
});

// node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/semver/functions/compare-loose.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var compareLoose = (a, b) => compare(a, b, true);
    module2.exports = compareLoose;
  }
});

// node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/semver/functions/compare-build.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var compareBuild = (a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module2.exports = compareBuild;
  }
});

// node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/semver/functions/sort.js"(exports2, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module2.exports = sort;
  }
});

// node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/semver/functions/rsort.js"(exports2, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module2.exports = rsort;
  }
});

// node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/semver/functions/gt.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var gt = (a, b, loose) => compare(a, b, loose) > 0;
    module2.exports = gt;
  }
});

// node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/semver/functions/lt.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var lt = (a, b, loose) => compare(a, b, loose) < 0;
    module2.exports = lt;
  }
});

// node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/semver/functions/eq.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var eq = (a, b, loose) => compare(a, b, loose) === 0;
    module2.exports = eq;
  }
});

// node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/semver/functions/neq.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var neq = (a, b, loose) => compare(a, b, loose) !== 0;
    module2.exports = neq;
  }
});

// node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/semver/functions/gte.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var gte = (a, b, loose) => compare(a, b, loose) >= 0;
    module2.exports = gte;
  }
});

// node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/semver/functions/lte.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var lte = (a, b, loose) => compare(a, b, loose) <= 0;
    module2.exports = lte;
  }
});

// node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/semver/functions/cmp.js"(exports2, module2) {
    "use strict";
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = (a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module2.exports = cmp;
  }
});

// node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/semver/functions/coerce.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = require_parse2();
    var { safeRe: re2, t } = require_re();
    var coerce = (version, options) => {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === "number") {
        version = String(version);
      }
      if (typeof version !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version.match(options.includePrerelease ? re2[t.COERCEFULL] : re2[t.COERCE]);
      } else {
        const coerceRtlRegex = options.includePrerelease ? re2[t.COERCERTLFULL] : re2[t.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major2 = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major2}.${minor}.${patch}${prerelease}${build}`, options);
    };
    module2.exports = coerce;
  }
});

// node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "node_modules/semver/internal/lrucache.js"(exports2, module2) {
    "use strict";
    var LRUCache = class {
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module2.exports = LRUCache;
  }
});

// node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/semver/classes/range.js"(exports2, module2) {
    "use strict";
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class _Range {
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof _Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re2[t.HYPHENRANGELOOSE] : re2[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = range.replace(re2[t.COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range);
        range = range.replace(re2[t.TILDETRIM], tildeTrimReplace);
        debug("tilde trim", range);
        range = range.replace(re2[t.CARETTRIM], caretTrimReplace);
        debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re2[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version) {
        if (!version) {
          return false;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module2.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re2,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants2();
    var isNullSet = (c) => c.value === "<0.0.0-0";
    var isAny = (c) => c.value === "";
    var isSatisfiable = (comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options) => {
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
    var replaceTildes = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
    };
    var replaceTilde = (comp, options) => {
      const r = options.loose ? re2[t.TILDELOOSE] : re2[t.TILDE];
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
    };
    var replaceCaret = (comp, options) => {
      debug("caret", comp, options);
      const r = options.loose ? re2[t.CARETLOOSE] : re2[t.CARET];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options) => {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
    };
    var replaceXRange = (comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re2[t.XRANGELOOSE] : re2[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    };
    var replaceStars = (comp, options) => {
      debug("replaceStars", comp, options);
      return comp.trim().replace(re2[t.STAR], "");
    };
    var replaceGTE0 = (comp, options) => {
      debug("replaceGTE0", comp, options);
      return comp.trim().replace(re2[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    };
    var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    };
    var testSet = (set, version, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  }
});

// node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "node_modules/semver/classes/comparator.js"(exports2, module2) {
    "use strict";
    var ANY = Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re2[t.COMPARATORLOOSE] : re2[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version) {
        debug("Comparator.test", version, this.options.loose);
        if (this.semver === ANY || version === ANY) {
          return true;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module2.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re2, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "node_modules/semver/functions/satisfies.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var satisfies = (version, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version);
    };
    module2.exports = satisfies;
  }
});

// node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/semver/ranges/to-comparators.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module2.exports = toComparators;
  }
});

// node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/semver/ranges/max-satisfying.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = (versions, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    };
    module2.exports = maxSatisfying;
  }
});

// node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/semver/ranges/min-satisfying.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = (versions, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    };
    module2.exports = minSatisfying;
  }
});

// node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/semver/ranges/min-version.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    };
    module2.exports = minVersion;
  }
});

// node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/semver/ranges/valid.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var validRange = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    };
    module2.exports = validRange;
  }
});

// node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/semver/ranges/outside.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = (version, range, hilo, options) => {
      version = new SemVer(version, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    };
    module2.exports = outside;
  }
});

// node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/semver/ranges/gtr.js"(exports2, module2) {
    "use strict";
    var outside = require_outside();
    var gtr = (version, range, options) => outside(version, range, ">", options);
    module2.exports = gtr;
  }
});

// node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/semver/ranges/ltr.js"(exports2, module2) {
    "use strict";
    var outside = require_outside();
    var ltr = (version, range, options) => outside(version, range, "<", options);
    module2.exports = ltr;
  }
});

// node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/semver/ranges/intersects.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var intersects = (r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    };
    module2.exports = intersects;
  }
});

// node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/semver/ranges/simplify.js"(exports2, module2) {
    "use strict";
    var satisfies = require_satisfies();
    var compare = require_compare();
    module2.exports = (versions, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions.sort((a, b) => compare(a, b, options));
      for (const version of v) {
        const included = satisfies(version, range, options);
        if (included) {
          prev = version;
          if (!first) {
            first = version;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "node_modules/semver/ranges/subset.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare = require_compare();
    var subset = (sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER: for (const simpleSub of sub.set) {
        for (const simpleDom of dom.set) {
          const isSub = simpleSubset(simpleSub, simpleDom, options);
          sawNonNull = sawNonNull || isSub !== null;
          if (isSub) {
            continue OUTER;
          }
        }
        if (sawNonNull) {
          return false;
        }
      }
      return true;
    };
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = (sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt = higherGT(gt, c, options);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt = lowerLT(lt, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare(gt.semver, lt.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
      let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt, c, options);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (gt.operator === ">=" && !satisfies(gt.semver, String(c), options)) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt, c, options);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (lt.operator === "<=" && !satisfies(lt.semver, String(c), options)) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    };
    var higherGT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
    };
    var lowerLT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
    };
    module2.exports = subset;
  }
});

// node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/semver/index.js"(exports2, module2) {
    "use strict";
    var internalRe = require_re();
    var constants = require_constants2();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse = require_parse2();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major2 = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt = require_gt();
    var lt = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module2.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major: major2,
      minor,
      patch,
      prerelease,
      compare,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// node_modules/@aws-amplify/platform-core/lib/object_accumulator.js
var require_object_accumulator = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/object_accumulator.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ObjectAccumulator = exports2.ObjectAccumulatorVersionMismatchError = exports2.ObjectAccumulatorPropertyAlreadyExistsError = void 0;
    var lodash_mergewith_1 = __importDefault(require_lodash());
    var semver_1 = __importDefault(require_semver2());
    var ObjectAccumulatorPropertyAlreadyExistsError = class extends Error {
      key;
      existingValue;
      incomingValue;
      /**
       * Creates property already exists error.
       */
      constructor(key, existingValue, incomingValue) {
        super(`Property ${key} already exists`);
        this.key = key;
        this.existingValue = existingValue;
        this.incomingValue = incomingValue;
      }
    };
    exports2.ObjectAccumulatorPropertyAlreadyExistsError = ObjectAccumulatorPropertyAlreadyExistsError;
    var ObjectAccumulatorVersionMismatchError = class extends Error {
      existingVersion;
      newVersion;
      /**
       * Creates property already exists error.
       */
      constructor(existingVersion, newVersion) {
        super(`Version mismatch: Cannot accumulate new objects with version ${newVersion} with existing accumulated object with version ${existingVersion}`);
        this.existingVersion = existingVersion;
        this.newVersion = newVersion;
      }
    };
    exports2.ObjectAccumulatorVersionMismatchError = ObjectAccumulatorVersionMismatchError;
    var ObjectAccumulator = class {
      accumulator;
      versionKey;
      /**
       * creates object accumulator.
       */
      constructor(accumulator, versionKey = "version") {
        this.accumulator = accumulator;
        this.versionKey = versionKey;
      }
      /**
       * Accumulate a new object part with accumulator.
       * This method throws if there is any intersection between the object parts
       * except for the versionKey, which should be the same across all object parts (nested objects included)
       * @param part a new object part to accumulate
       * @returns the accumulator object for easy chaining
       */
      accumulate = (part) => {
        (0, lodash_mergewith_1.default)(this.accumulator, part, (existingValue, incomingValue, key) => {
          if (Array.isArray(existingValue)) {
            return existingValue.concat(incomingValue);
          }
          if (existingValue && typeof existingValue !== "object") {
            if (key === this.versionKey) {
              const incomingVersion = semver_1.default.coerce(incomingValue);
              const existingVersion = semver_1.default.coerce(existingValue);
              if (incomingVersion && existingVersion) {
                if (incomingVersion.major !== existingVersion.major) {
                  throw new ObjectAccumulatorVersionMismatchError(existingValue, incomingValue);
                } else {
                  return semver_1.default.gte(incomingVersion, existingVersion) ? incomingValue : existingValue;
                }
              }
            } else if (key !== this.versionKey) {
              throw new ObjectAccumulatorPropertyAlreadyExistsError(key, existingValue, incomingValue);
            }
          }
          return void 0;
        });
        return this;
      };
      getAccumulatedObject = () => {
        return this.accumulator;
      };
    };
    exports2.ObjectAccumulator = ObjectAccumulator;
  }
});

// node_modules/@aws-amplify/platform-core/lib/tag_name.js
var require_tag_name = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/tag_name.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TagName = void 0;
    var TagName;
    (function(TagName2) {
      TagName2["FRIENDLY_NAME"] = "amplify:friendly-name";
    })(TagName || (exports2.TagName = TagName = {}));
  }
});

// node_modules/lodash.snakecase/index.js
var require_lodash2 = __commonJS({
  "node_modules/lodash.snakecase/index.js"(exports2, module2) {
    var INFINITY = 1 / 0;
    var symbolTag = "[object Symbol]";
    var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;
    var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;
    var rsAstralRange = "\\ud800-\\udfff";
    var rsComboMarksRange = "\\u0300-\\u036f\\ufe20-\\ufe23";
    var rsComboSymbolsRange = "\\u20d0-\\u20f0";
    var rsDingbatRange = "\\u2700-\\u27bf";
    var rsLowerRange = "a-z\\xdf-\\xf6\\xf8-\\xff";
    var rsMathOpRange = "\\xac\\xb1\\xd7\\xf7";
    var rsNonCharRange = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf";
    var rsPunctuationRange = "\\u2000-\\u206f";
    var rsSpaceRange = " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000";
    var rsUpperRange = "A-Z\\xc0-\\xd6\\xd8-\\xde";
    var rsVarRange = "\\ufe0e\\ufe0f";
    var rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;
    var rsApos = "['\u2019]";
    var rsBreak = "[" + rsBreakRange + "]";
    var rsCombo = "[" + rsComboMarksRange + rsComboSymbolsRange + "]";
    var rsDigits = "\\d+";
    var rsDingbat = "[" + rsDingbatRange + "]";
    var rsLower = "[" + rsLowerRange + "]";
    var rsMisc = "[^" + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + "]";
    var rsFitz = "\\ud83c[\\udffb-\\udfff]";
    var rsModifier = "(?:" + rsCombo + "|" + rsFitz + ")";
    var rsNonAstral = "[^" + rsAstralRange + "]";
    var rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}";
    var rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]";
    var rsUpper = "[" + rsUpperRange + "]";
    var rsZWJ = "\\u200d";
    var rsLowerMisc = "(?:" + rsLower + "|" + rsMisc + ")";
    var rsUpperMisc = "(?:" + rsUpper + "|" + rsMisc + ")";
    var rsOptLowerContr = "(?:" + rsApos + "(?:d|ll|m|re|s|t|ve))?";
    var rsOptUpperContr = "(?:" + rsApos + "(?:D|LL|M|RE|S|T|VE))?";
    var reOptMod = rsModifier + "?";
    var rsOptVar = "[" + rsVarRange + "]?";
    var rsOptJoin = "(?:" + rsZWJ + "(?:" + [rsNonAstral, rsRegional, rsSurrPair].join("|") + ")" + rsOptVar + reOptMod + ")*";
    var rsSeq = rsOptVar + reOptMod + rsOptJoin;
    var rsEmoji = "(?:" + [rsDingbat, rsRegional, rsSurrPair].join("|") + ")" + rsSeq;
    var reApos = RegExp(rsApos, "g");
    var reComboMark = RegExp(rsCombo, "g");
    var reUnicodeWord = RegExp([
      rsUpper + "?" + rsLower + "+" + rsOptLowerContr + "(?=" + [rsBreak, rsUpper, "$"].join("|") + ")",
      rsUpperMisc + "+" + rsOptUpperContr + "(?=" + [rsBreak, rsUpper + rsLowerMisc, "$"].join("|") + ")",
      rsUpper + "?" + rsLowerMisc + "+" + rsOptLowerContr,
      rsUpper + "+" + rsOptUpperContr,
      rsDigits,
      rsEmoji
    ].join("|"), "g");
    var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2,}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;
    var deburredLetters = {
      // Latin-1 Supplement block.
      "\xC0": "A",
      "\xC1": "A",
      "\xC2": "A",
      "\xC3": "A",
      "\xC4": "A",
      "\xC5": "A",
      "\xE0": "a",
      "\xE1": "a",
      "\xE2": "a",
      "\xE3": "a",
      "\xE4": "a",
      "\xE5": "a",
      "\xC7": "C",
      "\xE7": "c",
      "\xD0": "D",
      "\xF0": "d",
      "\xC8": "E",
      "\xC9": "E",
      "\xCA": "E",
      "\xCB": "E",
      "\xE8": "e",
      "\xE9": "e",
      "\xEA": "e",
      "\xEB": "e",
      "\xCC": "I",
      "\xCD": "I",
      "\xCE": "I",
      "\xCF": "I",
      "\xEC": "i",
      "\xED": "i",
      "\xEE": "i",
      "\xEF": "i",
      "\xD1": "N",
      "\xF1": "n",
      "\xD2": "O",
      "\xD3": "O",
      "\xD4": "O",
      "\xD5": "O",
      "\xD6": "O",
      "\xD8": "O",
      "\xF2": "o",
      "\xF3": "o",
      "\xF4": "o",
      "\xF5": "o",
      "\xF6": "o",
      "\xF8": "o",
      "\xD9": "U",
      "\xDA": "U",
      "\xDB": "U",
      "\xDC": "U",
      "\xF9": "u",
      "\xFA": "u",
      "\xFB": "u",
      "\xFC": "u",
      "\xDD": "Y",
      "\xFD": "y",
      "\xFF": "y",
      "\xC6": "Ae",
      "\xE6": "ae",
      "\xDE": "Th",
      "\xFE": "th",
      "\xDF": "ss",
      // Latin Extended-A block.
      "\u0100": "A",
      "\u0102": "A",
      "\u0104": "A",
      "\u0101": "a",
      "\u0103": "a",
      "\u0105": "a",
      "\u0106": "C",
      "\u0108": "C",
      "\u010A": "C",
      "\u010C": "C",
      "\u0107": "c",
      "\u0109": "c",
      "\u010B": "c",
      "\u010D": "c",
      "\u010E": "D",
      "\u0110": "D",
      "\u010F": "d",
      "\u0111": "d",
      "\u0112": "E",
      "\u0114": "E",
      "\u0116": "E",
      "\u0118": "E",
      "\u011A": "E",
      "\u0113": "e",
      "\u0115": "e",
      "\u0117": "e",
      "\u0119": "e",
      "\u011B": "e",
      "\u011C": "G",
      "\u011E": "G",
      "\u0120": "G",
      "\u0122": "G",
      "\u011D": "g",
      "\u011F": "g",
      "\u0121": "g",
      "\u0123": "g",
      "\u0124": "H",
      "\u0126": "H",
      "\u0125": "h",
      "\u0127": "h",
      "\u0128": "I",
      "\u012A": "I",
      "\u012C": "I",
      "\u012E": "I",
      "\u0130": "I",
      "\u0129": "i",
      "\u012B": "i",
      "\u012D": "i",
      "\u012F": "i",
      "\u0131": "i",
      "\u0134": "J",
      "\u0135": "j",
      "\u0136": "K",
      "\u0137": "k",
      "\u0138": "k",
      "\u0139": "L",
      "\u013B": "L",
      "\u013D": "L",
      "\u013F": "L",
      "\u0141": "L",
      "\u013A": "l",
      "\u013C": "l",
      "\u013E": "l",
      "\u0140": "l",
      "\u0142": "l",
      "\u0143": "N",
      "\u0145": "N",
      "\u0147": "N",
      "\u014A": "N",
      "\u0144": "n",
      "\u0146": "n",
      "\u0148": "n",
      "\u014B": "n",
      "\u014C": "O",
      "\u014E": "O",
      "\u0150": "O",
      "\u014D": "o",
      "\u014F": "o",
      "\u0151": "o",
      "\u0154": "R",
      "\u0156": "R",
      "\u0158": "R",
      "\u0155": "r",
      "\u0157": "r",
      "\u0159": "r",
      "\u015A": "S",
      "\u015C": "S",
      "\u015E": "S",
      "\u0160": "S",
      "\u015B": "s",
      "\u015D": "s",
      "\u015F": "s",
      "\u0161": "s",
      "\u0162": "T",
      "\u0164": "T",
      "\u0166": "T",
      "\u0163": "t",
      "\u0165": "t",
      "\u0167": "t",
      "\u0168": "U",
      "\u016A": "U",
      "\u016C": "U",
      "\u016E": "U",
      "\u0170": "U",
      "\u0172": "U",
      "\u0169": "u",
      "\u016B": "u",
      "\u016D": "u",
      "\u016F": "u",
      "\u0171": "u",
      "\u0173": "u",
      "\u0174": "W",
      "\u0175": "w",
      "\u0176": "Y",
      "\u0177": "y",
      "\u0178": "Y",
      "\u0179": "Z",
      "\u017B": "Z",
      "\u017D": "Z",
      "\u017A": "z",
      "\u017C": "z",
      "\u017E": "z",
      "\u0132": "IJ",
      "\u0133": "ij",
      "\u0152": "Oe",
      "\u0153": "oe",
      "\u0149": "'n",
      "\u017F": "ss"
    };
    var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    function arrayReduce(array, iteratee, accumulator, initAccum) {
      var index = -1, length = array ? array.length : 0;
      if (initAccum && length) {
        accumulator = array[++index];
      }
      while (++index < length) {
        accumulator = iteratee(accumulator, array[index], index, array);
      }
      return accumulator;
    }
    function asciiWords(string) {
      return string.match(reAsciiWord) || [];
    }
    function basePropertyOf(object) {
      return function(key) {
        return object == null ? void 0 : object[key];
      };
    }
    var deburrLetter = basePropertyOf(deburredLetters);
    function hasUnicodeWord(string) {
      return reHasUnicodeWord.test(string);
    }
    function unicodeWords(string) {
      return string.match(reUnicodeWord) || [];
    }
    var objectProto = Object.prototype;
    var objectToString = objectProto.toString;
    var Symbol2 = root.Symbol;
    var symbolProto = Symbol2 ? Symbol2.prototype : void 0;
    var symbolToString = symbolProto ? symbolProto.toString : void 0;
    function baseToString(value) {
      if (typeof value == "string") {
        return value;
      }
      if (isSymbol(value)) {
        return symbolToString ? symbolToString.call(value) : "";
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    function createCompounder(callback) {
      return function(string) {
        return arrayReduce(words(deburr(string).replace(reApos, "")), callback, "");
      };
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    function toString(value) {
      return value == null ? "" : baseToString(value);
    }
    function deburr(string) {
      string = toString(string);
      return string && string.replace(reLatin, deburrLetter).replace(reComboMark, "");
    }
    var snakeCase = createCompounder(function(result, word, index) {
      return result + (index ? "_" : "") + word.toLowerCase();
    });
    function words(string, pattern, guard) {
      string = toString(string);
      pattern = guard ? void 0 : pattern;
      if (pattern === void 0) {
        return hasUnicodeWord(string) ? unicodeWords(string) : asciiWords(string);
      }
      return string.match(pattern) || [];
    }
    module2.exports = snakeCase;
  }
});

// node_modules/@aws-amplify/platform-core/lib/naming_convention_conversions.js
var require_naming_convention_conversions = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/naming_convention_conversions.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NamingConverter = void 0;
    var lodash_snakecase_1 = __importDefault(require_lodash2());
    var NamingConverter = class {
      /**
       * Converts input string to SCREAMING_SNAKE_CASE
       * @param input Input string to convert
       */
      toScreamingSnakeCase(input) {
        return (0, lodash_snakecase_1.default)(input).toUpperCase();
      }
    };
    exports2.NamingConverter = NamingConverter;
  }
});

// node_modules/@opentelemetry/api/build/esm/platform/node/globalThis.js
var _globalThis;
var init_globalThis = __esm({
  "node_modules/@opentelemetry/api/build/esm/platform/node/globalThis.js"() {
    _globalThis = typeof globalThis === "object" ? globalThis : global;
  }
});

// node_modules/@opentelemetry/api/build/esm/platform/node/index.js
var init_node = __esm({
  "node_modules/@opentelemetry/api/build/esm/platform/node/index.js"() {
    init_globalThis();
  }
});

// node_modules/@opentelemetry/api/build/esm/platform/index.js
var init_platform = __esm({
  "node_modules/@opentelemetry/api/build/esm/platform/index.js"() {
    init_node();
  }
});

// node_modules/@opentelemetry/api/build/esm/version.js
var VERSION;
var init_version = __esm({
  "node_modules/@opentelemetry/api/build/esm/version.js"() {
    VERSION = "1.9.0";
  }
});

// node_modules/@opentelemetry/api/build/esm/internal/semver.js
function _makeCompatibilityCheck(ownVersion) {
  var acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
  var rejectedVersions = /* @__PURE__ */ new Set();
  var myVersionMatch = ownVersion.match(re);
  if (!myVersionMatch) {
    return function() {
      return false;
    };
  }
  var ownVersionParsed = {
    major: +myVersionMatch[1],
    minor: +myVersionMatch[2],
    patch: +myVersionMatch[3],
    prerelease: myVersionMatch[4]
  };
  if (ownVersionParsed.prerelease != null) {
    return function isExactmatch(globalVersion) {
      return globalVersion === ownVersion;
    };
  }
  function _reject(v) {
    rejectedVersions.add(v);
    return false;
  }
  function _accept(v) {
    acceptedVersions.add(v);
    return true;
  }
  return function isCompatible2(globalVersion) {
    if (acceptedVersions.has(globalVersion)) {
      return true;
    }
    if (rejectedVersions.has(globalVersion)) {
      return false;
    }
    var globalVersionMatch = globalVersion.match(re);
    if (!globalVersionMatch) {
      return _reject(globalVersion);
    }
    var globalVersionParsed = {
      major: +globalVersionMatch[1],
      minor: +globalVersionMatch[2],
      patch: +globalVersionMatch[3],
      prerelease: globalVersionMatch[4]
    };
    if (globalVersionParsed.prerelease != null) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major !== globalVersionParsed.major) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major === 0) {
      if (ownVersionParsed.minor === globalVersionParsed.minor && ownVersionParsed.patch <= globalVersionParsed.patch) {
        return _accept(globalVersion);
      }
      return _reject(globalVersion);
    }
    if (ownVersionParsed.minor <= globalVersionParsed.minor) {
      return _accept(globalVersion);
    }
    return _reject(globalVersion);
  };
}
var re, isCompatible;
var init_semver = __esm({
  "node_modules/@opentelemetry/api/build/esm/internal/semver.js"() {
    init_version();
    re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
    isCompatible = _makeCompatibilityCheck(VERSION);
  }
});

// node_modules/@opentelemetry/api/build/esm/internal/global-utils.js
function registerGlobal(type, instance, diag3, allowOverride) {
  var _a;
  if (allowOverride === void 0) {
    allowOverride = false;
  }
  var api = _global[GLOBAL_OPENTELEMETRY_API_KEY] = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a !== void 0 ? _a : {
    version: VERSION
  };
  if (!allowOverride && api[type]) {
    var err = new Error("@opentelemetry/api: Attempted duplicate registration of API: " + type);
    diag3.error(err.stack || err.message);
    return false;
  }
  if (api.version !== VERSION) {
    var err = new Error("@opentelemetry/api: Registration of version v" + api.version + " for " + type + " does not match previously registered API v" + VERSION);
    diag3.error(err.stack || err.message);
    return false;
  }
  api[type] = instance;
  diag3.debug("@opentelemetry/api: Registered a global for " + type + " v" + VERSION + ".");
  return true;
}
function getGlobal(type) {
  var _a, _b;
  var globalVersion = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a === void 0 ? void 0 : _a.version;
  if (!globalVersion || !isCompatible(globalVersion)) {
    return;
  }
  return (_b = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === void 0 ? void 0 : _b[type];
}
function unregisterGlobal(type, diag3) {
  diag3.debug("@opentelemetry/api: Unregistering a global for " + type + " v" + VERSION + ".");
  var api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
  if (api) {
    delete api[type];
  }
}
var major, GLOBAL_OPENTELEMETRY_API_KEY, _global;
var init_global_utils = __esm({
  "node_modules/@opentelemetry/api/build/esm/internal/global-utils.js"() {
    init_platform();
    init_version();
    init_semver();
    major = VERSION.split(".")[0];
    GLOBAL_OPENTELEMETRY_API_KEY = Symbol.for("opentelemetry.js.api." + major);
    _global = _globalThis;
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js
function logProxy(funcName, namespace, args) {
  var logger = getGlobal("diag");
  if (!logger) {
    return;
  }
  args.unshift(namespace);
  return logger[funcName].apply(logger, __spreadArray([], __read(args), false));
}
var __read, __spreadArray, DiagComponentLogger;
var init_ComponentLogger = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js"() {
    init_global_utils();
    __read = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    DiagComponentLogger = /** @class */
    (function() {
      function DiagComponentLogger2(props) {
        this._namespace = props.namespace || "DiagComponentLogger";
      }
      DiagComponentLogger2.prototype.debug = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("debug", this._namespace, args);
      };
      DiagComponentLogger2.prototype.error = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("error", this._namespace, args);
      };
      DiagComponentLogger2.prototype.info = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("info", this._namespace, args);
      };
      DiagComponentLogger2.prototype.warn = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("warn", this._namespace, args);
      };
      DiagComponentLogger2.prototype.verbose = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("verbose", this._namespace, args);
      };
      return DiagComponentLogger2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/types.js
var DiagLogLevel;
var init_types = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/types.js"() {
    (function(DiagLogLevel2) {
      DiagLogLevel2[DiagLogLevel2["NONE"] = 0] = "NONE";
      DiagLogLevel2[DiagLogLevel2["ERROR"] = 30] = "ERROR";
      DiagLogLevel2[DiagLogLevel2["WARN"] = 50] = "WARN";
      DiagLogLevel2[DiagLogLevel2["INFO"] = 60] = "INFO";
      DiagLogLevel2[DiagLogLevel2["DEBUG"] = 70] = "DEBUG";
      DiagLogLevel2[DiagLogLevel2["VERBOSE"] = 80] = "VERBOSE";
      DiagLogLevel2[DiagLogLevel2["ALL"] = 9999] = "ALL";
    })(DiagLogLevel || (DiagLogLevel = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js
function createLogLevelDiagLogger(maxLevel, logger) {
  if (maxLevel < DiagLogLevel.NONE) {
    maxLevel = DiagLogLevel.NONE;
  } else if (maxLevel > DiagLogLevel.ALL) {
    maxLevel = DiagLogLevel.ALL;
  }
  logger = logger || {};
  function _filterFunc(funcName, theLevel) {
    var theFunc = logger[funcName];
    if (typeof theFunc === "function" && maxLevel >= theLevel) {
      return theFunc.bind(logger);
    }
    return function() {
    };
  }
  return {
    error: _filterFunc("error", DiagLogLevel.ERROR),
    warn: _filterFunc("warn", DiagLogLevel.WARN),
    info: _filterFunc("info", DiagLogLevel.INFO),
    debug: _filterFunc("debug", DiagLogLevel.DEBUG),
    verbose: _filterFunc("verbose", DiagLogLevel.VERBOSE)
  };
}
var init_logLevelLogger = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js"() {
    init_types();
  }
});

// node_modules/@opentelemetry/api/build/esm/api/diag.js
var __read2, __spreadArray2, API_NAME, DiagAPI;
var init_diag = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/diag.js"() {
    init_ComponentLogger();
    init_logLevelLogger();
    init_types();
    init_global_utils();
    __read2 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray2 = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    API_NAME = "diag";
    DiagAPI = /** @class */
    (function() {
      function DiagAPI2() {
        function _logProxy(funcName) {
          return function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var logger = getGlobal("diag");
            if (!logger)
              return;
            return logger[funcName].apply(logger, __spreadArray2([], __read2(args), false));
          };
        }
        var self2 = this;
        var setLogger = function(logger, optionsOrLogLevel) {
          var _a, _b, _c;
          if (optionsOrLogLevel === void 0) {
            optionsOrLogLevel = { logLevel: DiagLogLevel.INFO };
          }
          if (logger === self2) {
            var err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
            self2.error((_a = err.stack) !== null && _a !== void 0 ? _a : err.message);
            return false;
          }
          if (typeof optionsOrLogLevel === "number") {
            optionsOrLogLevel = {
              logLevel: optionsOrLogLevel
            };
          }
          var oldLogger = getGlobal("diag");
          var newLogger = createLogLevelDiagLogger((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : DiagLogLevel.INFO, logger);
          if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
            var stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : "<failed to generate stacktrace>";
            oldLogger.warn("Current logger will be overwritten from " + stack);
            newLogger.warn("Current logger will overwrite one already registered from " + stack);
          }
          return registerGlobal("diag", newLogger, self2, true);
        };
        self2.setLogger = setLogger;
        self2.disable = function() {
          unregisterGlobal(API_NAME, self2);
        };
        self2.createComponentLogger = function(options) {
          return new DiagComponentLogger(options);
        };
        self2.verbose = _logProxy("verbose");
        self2.debug = _logProxy("debug");
        self2.info = _logProxy("info");
        self2.warn = _logProxy("warn");
        self2.error = _logProxy("error");
      }
      DiagAPI2.instance = function() {
        if (!this._instance) {
          this._instance = new DiagAPI2();
        }
        return this._instance;
      };
      return DiagAPI2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js
var __read3, __values, BaggageImpl;
var init_baggage_impl = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js"() {
    __read3 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __values = function(o) {
      var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
      if (m) return m.call(o);
      if (o && typeof o.length === "number") return {
        next: function() {
          if (o && i >= o.length) o = void 0;
          return { value: o && o[i++], done: !o };
        }
      };
      throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    };
    BaggageImpl = /** @class */
    (function() {
      function BaggageImpl2(entries) {
        this._entries = entries ? new Map(entries) : /* @__PURE__ */ new Map();
      }
      BaggageImpl2.prototype.getEntry = function(key) {
        var entry = this._entries.get(key);
        if (!entry) {
          return void 0;
        }
        return Object.assign({}, entry);
      };
      BaggageImpl2.prototype.getAllEntries = function() {
        return Array.from(this._entries.entries()).map(function(_a) {
          var _b = __read3(_a, 2), k = _b[0], v = _b[1];
          return [k, v];
        });
      };
      BaggageImpl2.prototype.setEntry = function(key, entry) {
        var newBaggage = new BaggageImpl2(this._entries);
        newBaggage._entries.set(key, entry);
        return newBaggage;
      };
      BaggageImpl2.prototype.removeEntry = function(key) {
        var newBaggage = new BaggageImpl2(this._entries);
        newBaggage._entries.delete(key);
        return newBaggage;
      };
      BaggageImpl2.prototype.removeEntries = function() {
        var e_1, _a;
        var keys = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          keys[_i] = arguments[_i];
        }
        var newBaggage = new BaggageImpl2(this._entries);
        try {
          for (var keys_1 = __values(keys), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
            var key = keys_1_1.value;
            newBaggage._entries.delete(key);
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (keys_1_1 && !keys_1_1.done && (_a = keys_1.return)) _a.call(keys_1);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
        return newBaggage;
      };
      BaggageImpl2.prototype.clear = function() {
        return new BaggageImpl2();
      };
      return BaggageImpl2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js
var baggageEntryMetadataSymbol;
var init_symbol = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js"() {
    baggageEntryMetadataSymbol = Symbol("BaggageEntryMetadata");
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/utils.js
function createBaggage(entries) {
  if (entries === void 0) {
    entries = {};
  }
  return new BaggageImpl(new Map(Object.entries(entries)));
}
function baggageEntryMetadataFromString(str) {
  if (typeof str !== "string") {
    diag.error("Cannot create baggage metadata from unknown type: " + typeof str);
    str = "";
  }
  return {
    __TYPE__: baggageEntryMetadataSymbol,
    toString: function() {
      return str;
    }
  };
}
var diag;
var init_utils = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/utils.js"() {
    init_diag();
    init_baggage_impl();
    init_symbol();
    diag = DiagAPI.instance();
  }
});

// node_modules/@opentelemetry/api/build/esm/context/context.js
function createContextKey(description) {
  return Symbol.for(description);
}
var BaseContext, ROOT_CONTEXT;
var init_context = __esm({
  "node_modules/@opentelemetry/api/build/esm/context/context.js"() {
    BaseContext = /** @class */
    /* @__PURE__ */ (function() {
      function BaseContext2(parentContext) {
        var self2 = this;
        self2._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
        self2.getValue = function(key) {
          return self2._currentContext.get(key);
        };
        self2.setValue = function(key, value) {
          var context2 = new BaseContext2(self2._currentContext);
          context2._currentContext.set(key, value);
          return context2;
        };
        self2.deleteValue = function(key) {
          var context2 = new BaseContext2(self2._currentContext);
          context2._currentContext.delete(key);
          return context2;
        };
      }
      return BaseContext2;
    })();
    ROOT_CONTEXT = new BaseContext();
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/consoleLogger.js
var consoleMap, DiagConsoleLogger;
var init_consoleLogger = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/consoleLogger.js"() {
    consoleMap = [
      { n: "error", c: "error" },
      { n: "warn", c: "warn" },
      { n: "info", c: "info" },
      { n: "debug", c: "debug" },
      { n: "verbose", c: "trace" }
    ];
    DiagConsoleLogger = /** @class */
    /* @__PURE__ */ (function() {
      function DiagConsoleLogger2() {
        function _consoleFunc(funcName) {
          return function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            if (console) {
              var theFunc = console[funcName];
              if (typeof theFunc !== "function") {
                theFunc = console.log;
              }
              if (typeof theFunc === "function") {
                return theFunc.apply(console, args);
              }
            }
          };
        }
        for (var i = 0; i < consoleMap.length; i++) {
          this[consoleMap[i].n] = _consoleFunc(consoleMap[i].c);
        }
      }
      return DiagConsoleLogger2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics/NoopMeter.js
function createNoopMeter() {
  return NOOP_METER;
}
var __extends, NoopMeter, NoopMetric, NoopCounterMetric, NoopUpDownCounterMetric, NoopGaugeMetric, NoopHistogramMetric, NoopObservableMetric, NoopObservableCounterMetric, NoopObservableGaugeMetric, NoopObservableUpDownCounterMetric, NOOP_METER, NOOP_COUNTER_METRIC, NOOP_GAUGE_METRIC, NOOP_HISTOGRAM_METRIC, NOOP_UP_DOWN_COUNTER_METRIC, NOOP_OBSERVABLE_COUNTER_METRIC, NOOP_OBSERVABLE_GAUGE_METRIC, NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
var init_NoopMeter = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics/NoopMeter.js"() {
    __extends = /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    NoopMeter = /** @class */
    (function() {
      function NoopMeter2() {
      }
      NoopMeter2.prototype.createGauge = function(_name, _options) {
        return NOOP_GAUGE_METRIC;
      };
      NoopMeter2.prototype.createHistogram = function(_name, _options) {
        return NOOP_HISTOGRAM_METRIC;
      };
      NoopMeter2.prototype.createCounter = function(_name, _options) {
        return NOOP_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createUpDownCounter = function(_name, _options) {
        return NOOP_UP_DOWN_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createObservableGauge = function(_name, _options) {
        return NOOP_OBSERVABLE_GAUGE_METRIC;
      };
      NoopMeter2.prototype.createObservableCounter = function(_name, _options) {
        return NOOP_OBSERVABLE_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createObservableUpDownCounter = function(_name, _options) {
        return NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
      };
      NoopMeter2.prototype.addBatchObservableCallback = function(_callback, _observables) {
      };
      NoopMeter2.prototype.removeBatchObservableCallback = function(_callback) {
      };
      return NoopMeter2;
    })();
    NoopMetric = /** @class */
    /* @__PURE__ */ (function() {
      function NoopMetric2() {
      }
      return NoopMetric2;
    })();
    NoopCounterMetric = /** @class */
    (function(_super) {
      __extends(NoopCounterMetric2, _super);
      function NoopCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopCounterMetric2.prototype.add = function(_value, _attributes) {
      };
      return NoopCounterMetric2;
    })(NoopMetric);
    NoopUpDownCounterMetric = /** @class */
    (function(_super) {
      __extends(NoopUpDownCounterMetric2, _super);
      function NoopUpDownCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopUpDownCounterMetric2.prototype.add = function(_value, _attributes) {
      };
      return NoopUpDownCounterMetric2;
    })(NoopMetric);
    NoopGaugeMetric = /** @class */
    (function(_super) {
      __extends(NoopGaugeMetric2, _super);
      function NoopGaugeMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopGaugeMetric2.prototype.record = function(_value, _attributes) {
      };
      return NoopGaugeMetric2;
    })(NoopMetric);
    NoopHistogramMetric = /** @class */
    (function(_super) {
      __extends(NoopHistogramMetric2, _super);
      function NoopHistogramMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopHistogramMetric2.prototype.record = function(_value, _attributes) {
      };
      return NoopHistogramMetric2;
    })(NoopMetric);
    NoopObservableMetric = /** @class */
    (function() {
      function NoopObservableMetric2() {
      }
      NoopObservableMetric2.prototype.addCallback = function(_callback) {
      };
      NoopObservableMetric2.prototype.removeCallback = function(_callback) {
      };
      return NoopObservableMetric2;
    })();
    NoopObservableCounterMetric = /** @class */
    (function(_super) {
      __extends(NoopObservableCounterMetric2, _super);
      function NoopObservableCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableCounterMetric2;
    })(NoopObservableMetric);
    NoopObservableGaugeMetric = /** @class */
    (function(_super) {
      __extends(NoopObservableGaugeMetric2, _super);
      function NoopObservableGaugeMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableGaugeMetric2;
    })(NoopObservableMetric);
    NoopObservableUpDownCounterMetric = /** @class */
    (function(_super) {
      __extends(NoopObservableUpDownCounterMetric2, _super);
      function NoopObservableUpDownCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableUpDownCounterMetric2;
    })(NoopObservableMetric);
    NOOP_METER = new NoopMeter();
    NOOP_COUNTER_METRIC = new NoopCounterMetric();
    NOOP_GAUGE_METRIC = new NoopGaugeMetric();
    NOOP_HISTOGRAM_METRIC = new NoopHistogramMetric();
    NOOP_UP_DOWN_COUNTER_METRIC = new NoopUpDownCounterMetric();
    NOOP_OBSERVABLE_COUNTER_METRIC = new NoopObservableCounterMetric();
    NOOP_OBSERVABLE_GAUGE_METRIC = new NoopObservableGaugeMetric();
    NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new NoopObservableUpDownCounterMetric();
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics/Metric.js
var ValueType;
var init_Metric = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics/Metric.js"() {
    (function(ValueType2) {
      ValueType2[ValueType2["INT"] = 0] = "INT";
      ValueType2[ValueType2["DOUBLE"] = 1] = "DOUBLE";
    })(ValueType || (ValueType = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js
var defaultTextMapGetter, defaultTextMapSetter;
var init_TextMapPropagator = __esm({
  "node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js"() {
    defaultTextMapGetter = {
      get: function(carrier, key) {
        if (carrier == null) {
          return void 0;
        }
        return carrier[key];
      },
      keys: function(carrier) {
        if (carrier == null) {
          return [];
        }
        return Object.keys(carrier);
      }
    };
    defaultTextMapSetter = {
      set: function(carrier, key, value) {
        if (carrier == null) {
          return;
        }
        carrier[key] = value;
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js
var __read4, __spreadArray3, NoopContextManager;
var init_NoopContextManager = __esm({
  "node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js"() {
    init_context();
    __read4 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray3 = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    NoopContextManager = /** @class */
    (function() {
      function NoopContextManager2() {
      }
      NoopContextManager2.prototype.active = function() {
        return ROOT_CONTEXT;
      };
      NoopContextManager2.prototype.with = function(_context, fn, thisArg) {
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        return fn.call.apply(fn, __spreadArray3([thisArg], __read4(args), false));
      };
      NoopContextManager2.prototype.bind = function(_context, target) {
        return target;
      };
      NoopContextManager2.prototype.enable = function() {
        return this;
      };
      NoopContextManager2.prototype.disable = function() {
        return this;
      };
      return NoopContextManager2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/api/context.js
var __read5, __spreadArray4, API_NAME2, NOOP_CONTEXT_MANAGER, ContextAPI;
var init_context2 = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/context.js"() {
    init_NoopContextManager();
    init_global_utils();
    init_diag();
    __read5 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray4 = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    API_NAME2 = "context";
    NOOP_CONTEXT_MANAGER = new NoopContextManager();
    ContextAPI = /** @class */
    (function() {
      function ContextAPI2() {
      }
      ContextAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new ContextAPI2();
        }
        return this._instance;
      };
      ContextAPI2.prototype.setGlobalContextManager = function(contextManager) {
        return registerGlobal(API_NAME2, contextManager, DiagAPI.instance());
      };
      ContextAPI2.prototype.active = function() {
        return this._getContextManager().active();
      };
      ContextAPI2.prototype.with = function(context2, fn, thisArg) {
        var _a;
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        return (_a = this._getContextManager()).with.apply(_a, __spreadArray4([context2, fn, thisArg], __read5(args), false));
      };
      ContextAPI2.prototype.bind = function(context2, target) {
        return this._getContextManager().bind(context2, target);
      };
      ContextAPI2.prototype._getContextManager = function() {
        return getGlobal(API_NAME2) || NOOP_CONTEXT_MANAGER;
      };
      ContextAPI2.prototype.disable = function() {
        this._getContextManager().disable();
        unregisterGlobal(API_NAME2, DiagAPI.instance());
      };
      return ContextAPI2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js
var TraceFlags;
var init_trace_flags = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js"() {
    (function(TraceFlags2) {
      TraceFlags2[TraceFlags2["NONE"] = 0] = "NONE";
      TraceFlags2[TraceFlags2["SAMPLED"] = 1] = "SAMPLED";
    })(TraceFlags || (TraceFlags = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js
var INVALID_SPANID, INVALID_TRACEID, INVALID_SPAN_CONTEXT;
var init_invalid_span_constants = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js"() {
    init_trace_flags();
    INVALID_SPANID = "0000000000000000";
    INVALID_TRACEID = "00000000000000000000000000000000";
    INVALID_SPAN_CONTEXT = {
      traceId: INVALID_TRACEID,
      spanId: INVALID_SPANID,
      traceFlags: TraceFlags.NONE
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js
var NonRecordingSpan;
var init_NonRecordingSpan = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js"() {
    init_invalid_span_constants();
    NonRecordingSpan = /** @class */
    (function() {
      function NonRecordingSpan2(_spanContext) {
        if (_spanContext === void 0) {
          _spanContext = INVALID_SPAN_CONTEXT;
        }
        this._spanContext = _spanContext;
      }
      NonRecordingSpan2.prototype.spanContext = function() {
        return this._spanContext;
      };
      NonRecordingSpan2.prototype.setAttribute = function(_key, _value) {
        return this;
      };
      NonRecordingSpan2.prototype.setAttributes = function(_attributes) {
        return this;
      };
      NonRecordingSpan2.prototype.addEvent = function(_name, _attributes) {
        return this;
      };
      NonRecordingSpan2.prototype.addLink = function(_link) {
        return this;
      };
      NonRecordingSpan2.prototype.addLinks = function(_links) {
        return this;
      };
      NonRecordingSpan2.prototype.setStatus = function(_status) {
        return this;
      };
      NonRecordingSpan2.prototype.updateName = function(_name) {
        return this;
      };
      NonRecordingSpan2.prototype.end = function(_endTime) {
      };
      NonRecordingSpan2.prototype.isRecording = function() {
        return false;
      };
      NonRecordingSpan2.prototype.recordException = function(_exception, _time) {
      };
      return NonRecordingSpan2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/context-utils.js
function getSpan(context2) {
  return context2.getValue(SPAN_KEY) || void 0;
}
function getActiveSpan() {
  return getSpan(ContextAPI.getInstance().active());
}
function setSpan(context2, span) {
  return context2.setValue(SPAN_KEY, span);
}
function deleteSpan(context2) {
  return context2.deleteValue(SPAN_KEY);
}
function setSpanContext(context2, spanContext) {
  return setSpan(context2, new NonRecordingSpan(spanContext));
}
function getSpanContext(context2) {
  var _a;
  return (_a = getSpan(context2)) === null || _a === void 0 ? void 0 : _a.spanContext();
}
var SPAN_KEY;
var init_context_utils = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/context-utils.js"() {
    init_context();
    init_NonRecordingSpan();
    init_context2();
    SPAN_KEY = createContextKey("OpenTelemetry Context Key SPAN");
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js
function isValidTraceId(traceId) {
  return VALID_TRACEID_REGEX.test(traceId) && traceId !== INVALID_TRACEID;
}
function isValidSpanId(spanId) {
  return VALID_SPANID_REGEX.test(spanId) && spanId !== INVALID_SPANID;
}
function isSpanContextValid(spanContext) {
  return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
}
function wrapSpanContext(spanContext) {
  return new NonRecordingSpan(spanContext);
}
var VALID_TRACEID_REGEX, VALID_SPANID_REGEX;
var init_spancontext_utils = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js"() {
    init_invalid_span_constants();
    init_NonRecordingSpan();
    VALID_TRACEID_REGEX = /^([0-9a-f]{32})$/i;
    VALID_SPANID_REGEX = /^[0-9a-f]{16}$/i;
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js
function isSpanContext(spanContext) {
  return typeof spanContext === "object" && typeof spanContext["spanId"] === "string" && typeof spanContext["traceId"] === "string" && typeof spanContext["traceFlags"] === "number";
}
var contextApi, NoopTracer;
var init_NoopTracer = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js"() {
    init_context2();
    init_context_utils();
    init_NonRecordingSpan();
    init_spancontext_utils();
    contextApi = ContextAPI.getInstance();
    NoopTracer = /** @class */
    (function() {
      function NoopTracer2() {
      }
      NoopTracer2.prototype.startSpan = function(name, options, context2) {
        if (context2 === void 0) {
          context2 = contextApi.active();
        }
        var root = Boolean(options === null || options === void 0 ? void 0 : options.root);
        if (root) {
          return new NonRecordingSpan();
        }
        var parentFromContext = context2 && getSpanContext(context2);
        if (isSpanContext(parentFromContext) && isSpanContextValid(parentFromContext)) {
          return new NonRecordingSpan(parentFromContext);
        } else {
          return new NonRecordingSpan();
        }
      };
      NoopTracer2.prototype.startActiveSpan = function(name, arg2, arg3, arg4) {
        var opts;
        var ctx;
        var fn;
        if (arguments.length < 2) {
          return;
        } else if (arguments.length === 2) {
          fn = arg2;
        } else if (arguments.length === 3) {
          opts = arg2;
          fn = arg3;
        } else {
          opts = arg2;
          ctx = arg3;
          fn = arg4;
        }
        var parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi.active();
        var span = this.startSpan(name, opts, parentContext);
        var contextWithSpanSet = setSpan(parentContext, span);
        return contextApi.with(contextWithSpanSet, fn, void 0, span);
      };
      return NoopTracer2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js
var NOOP_TRACER, ProxyTracer;
var init_ProxyTracer = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js"() {
    init_NoopTracer();
    NOOP_TRACER = new NoopTracer();
    ProxyTracer = /** @class */
    (function() {
      function ProxyTracer2(_provider, name, version, options) {
        this._provider = _provider;
        this.name = name;
        this.version = version;
        this.options = options;
      }
      ProxyTracer2.prototype.startSpan = function(name, options, context2) {
        return this._getTracer().startSpan(name, options, context2);
      };
      ProxyTracer2.prototype.startActiveSpan = function(_name, _options, _context, _fn) {
        var tracer = this._getTracer();
        return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
      };
      ProxyTracer2.prototype._getTracer = function() {
        if (this._delegate) {
          return this._delegate;
        }
        var tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
        if (!tracer) {
          return NOOP_TRACER;
        }
        this._delegate = tracer;
        return this._delegate;
      };
      return ProxyTracer2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js
var NoopTracerProvider;
var init_NoopTracerProvider = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js"() {
    init_NoopTracer();
    NoopTracerProvider = /** @class */
    (function() {
      function NoopTracerProvider2() {
      }
      NoopTracerProvider2.prototype.getTracer = function(_name, _version, _options) {
        return new NoopTracer();
      };
      return NoopTracerProvider2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js
var NOOP_TRACER_PROVIDER, ProxyTracerProvider;
var init_ProxyTracerProvider = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js"() {
    init_ProxyTracer();
    init_NoopTracerProvider();
    NOOP_TRACER_PROVIDER = new NoopTracerProvider();
    ProxyTracerProvider = /** @class */
    (function() {
      function ProxyTracerProvider2() {
      }
      ProxyTracerProvider2.prototype.getTracer = function(name, version, options) {
        var _a;
        return (_a = this.getDelegateTracer(name, version, options)) !== null && _a !== void 0 ? _a : new ProxyTracer(this, name, version, options);
      };
      ProxyTracerProvider2.prototype.getDelegate = function() {
        var _a;
        return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_TRACER_PROVIDER;
      };
      ProxyTracerProvider2.prototype.setDelegate = function(delegate) {
        this._delegate = delegate;
      };
      ProxyTracerProvider2.prototype.getDelegateTracer = function(name, version, options) {
        var _a;
        return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getTracer(name, version, options);
      };
      return ProxyTracerProvider2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js
var SamplingDecision;
var init_SamplingResult = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js"() {
    (function(SamplingDecision2) {
      SamplingDecision2[SamplingDecision2["NOT_RECORD"] = 0] = "NOT_RECORD";
      SamplingDecision2[SamplingDecision2["RECORD"] = 1] = "RECORD";
      SamplingDecision2[SamplingDecision2["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
    })(SamplingDecision || (SamplingDecision = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/span_kind.js
var SpanKind;
var init_span_kind = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/span_kind.js"() {
    (function(SpanKind2) {
      SpanKind2[SpanKind2["INTERNAL"] = 0] = "INTERNAL";
      SpanKind2[SpanKind2["SERVER"] = 1] = "SERVER";
      SpanKind2[SpanKind2["CLIENT"] = 2] = "CLIENT";
      SpanKind2[SpanKind2["PRODUCER"] = 3] = "PRODUCER";
      SpanKind2[SpanKind2["CONSUMER"] = 4] = "CONSUMER";
    })(SpanKind || (SpanKind = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/status.js
var SpanStatusCode;
var init_status = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/status.js"() {
    (function(SpanStatusCode2) {
      SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
      SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
      SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
    })(SpanStatusCode || (SpanStatusCode = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-validators.js
function validateKey(key) {
  return VALID_KEY_REGEX.test(key);
}
function validateValue(value) {
  return VALID_VALUE_BASE_REGEX.test(value) && !INVALID_VALUE_COMMA_EQUAL_REGEX.test(value);
}
var VALID_KEY_CHAR_RANGE, VALID_KEY, VALID_VENDOR_KEY, VALID_KEY_REGEX, VALID_VALUE_BASE_REGEX, INVALID_VALUE_COMMA_EQUAL_REGEX;
var init_tracestate_validators = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-validators.js"() {
    VALID_KEY_CHAR_RANGE = "[_0-9a-z-*/]";
    VALID_KEY = "[a-z]" + VALID_KEY_CHAR_RANGE + "{0,255}";
    VALID_VENDOR_KEY = "[a-z0-9]" + VALID_KEY_CHAR_RANGE + "{0,240}@[a-z]" + VALID_KEY_CHAR_RANGE + "{0,13}";
    VALID_KEY_REGEX = new RegExp("^(?:" + VALID_KEY + "|" + VALID_VENDOR_KEY + ")$");
    VALID_VALUE_BASE_REGEX = /^[ -~]{0,255}[!-~]$/;
    INVALID_VALUE_COMMA_EQUAL_REGEX = /,|=/;
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-impl.js
var MAX_TRACE_STATE_ITEMS, MAX_TRACE_STATE_LEN, LIST_MEMBERS_SEPARATOR, LIST_MEMBER_KEY_VALUE_SPLITTER, TraceStateImpl;
var init_tracestate_impl = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-impl.js"() {
    init_tracestate_validators();
    MAX_TRACE_STATE_ITEMS = 32;
    MAX_TRACE_STATE_LEN = 512;
    LIST_MEMBERS_SEPARATOR = ",";
    LIST_MEMBER_KEY_VALUE_SPLITTER = "=";
    TraceStateImpl = /** @class */
    (function() {
      function TraceStateImpl2(rawTraceState) {
        this._internalState = /* @__PURE__ */ new Map();
        if (rawTraceState)
          this._parse(rawTraceState);
      }
      TraceStateImpl2.prototype.set = function(key, value) {
        var traceState = this._clone();
        if (traceState._internalState.has(key)) {
          traceState._internalState.delete(key);
        }
        traceState._internalState.set(key, value);
        return traceState;
      };
      TraceStateImpl2.prototype.unset = function(key) {
        var traceState = this._clone();
        traceState._internalState.delete(key);
        return traceState;
      };
      TraceStateImpl2.prototype.get = function(key) {
        return this._internalState.get(key);
      };
      TraceStateImpl2.prototype.serialize = function() {
        var _this = this;
        return this._keys().reduce(function(agg, key) {
          agg.push(key + LIST_MEMBER_KEY_VALUE_SPLITTER + _this.get(key));
          return agg;
        }, []).join(LIST_MEMBERS_SEPARATOR);
      };
      TraceStateImpl2.prototype._parse = function(rawTraceState) {
        if (rawTraceState.length > MAX_TRACE_STATE_LEN)
          return;
        this._internalState = rawTraceState.split(LIST_MEMBERS_SEPARATOR).reverse().reduce(function(agg, part) {
          var listMember = part.trim();
          var i = listMember.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER);
          if (i !== -1) {
            var key = listMember.slice(0, i);
            var value = listMember.slice(i + 1, part.length);
            if (validateKey(key) && validateValue(value)) {
              agg.set(key, value);
            } else {
            }
          }
          return agg;
        }, /* @__PURE__ */ new Map());
        if (this._internalState.size > MAX_TRACE_STATE_ITEMS) {
          this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, MAX_TRACE_STATE_ITEMS));
        }
      };
      TraceStateImpl2.prototype._keys = function() {
        return Array.from(this._internalState.keys()).reverse();
      };
      TraceStateImpl2.prototype._clone = function() {
        var traceState = new TraceStateImpl2();
        traceState._internalState = new Map(this._internalState);
        return traceState;
      };
      return TraceStateImpl2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/internal/utils.js
function createTraceState(rawTraceState) {
  return new TraceStateImpl(rawTraceState);
}
var init_utils2 = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/internal/utils.js"() {
    init_tracestate_impl();
  }
});

// node_modules/@opentelemetry/api/build/esm/context-api.js
var context;
var init_context_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/context-api.js"() {
    init_context2();
    context = ContextAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/diag-api.js
var diag2;
var init_diag_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag-api.js"() {
    init_diag();
    diag2 = DiagAPI.instance();
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics/NoopMeterProvider.js
var NoopMeterProvider, NOOP_METER_PROVIDER;
var init_NoopMeterProvider = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics/NoopMeterProvider.js"() {
    init_NoopMeter();
    NoopMeterProvider = /** @class */
    (function() {
      function NoopMeterProvider2() {
      }
      NoopMeterProvider2.prototype.getMeter = function(_name, _version, _options) {
        return NOOP_METER;
      };
      return NoopMeterProvider2;
    })();
    NOOP_METER_PROVIDER = new NoopMeterProvider();
  }
});

// node_modules/@opentelemetry/api/build/esm/api/metrics.js
var API_NAME3, MetricsAPI;
var init_metrics = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/metrics.js"() {
    init_NoopMeterProvider();
    init_global_utils();
    init_diag();
    API_NAME3 = "metrics";
    MetricsAPI = /** @class */
    (function() {
      function MetricsAPI2() {
      }
      MetricsAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new MetricsAPI2();
        }
        return this._instance;
      };
      MetricsAPI2.prototype.setGlobalMeterProvider = function(provider) {
        return registerGlobal(API_NAME3, provider, DiagAPI.instance());
      };
      MetricsAPI2.prototype.getMeterProvider = function() {
        return getGlobal(API_NAME3) || NOOP_METER_PROVIDER;
      };
      MetricsAPI2.prototype.getMeter = function(name, version, options) {
        return this.getMeterProvider().getMeter(name, version, options);
      };
      MetricsAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME3, DiagAPI.instance());
      };
      return MetricsAPI2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics-api.js
var metrics;
var init_metrics_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics-api.js"() {
    init_metrics();
    metrics = MetricsAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js
var NoopTextMapPropagator;
var init_NoopTextMapPropagator = __esm({
  "node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js"() {
    NoopTextMapPropagator = /** @class */
    (function() {
      function NoopTextMapPropagator2() {
      }
      NoopTextMapPropagator2.prototype.inject = function(_context, _carrier) {
      };
      NoopTextMapPropagator2.prototype.extract = function(context2, _carrier) {
        return context2;
      };
      NoopTextMapPropagator2.prototype.fields = function() {
        return [];
      };
      return NoopTextMapPropagator2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js
function getBaggage(context2) {
  return context2.getValue(BAGGAGE_KEY) || void 0;
}
function getActiveBaggage() {
  return getBaggage(ContextAPI.getInstance().active());
}
function setBaggage(context2, baggage) {
  return context2.setValue(BAGGAGE_KEY, baggage);
}
function deleteBaggage(context2) {
  return context2.deleteValue(BAGGAGE_KEY);
}
var BAGGAGE_KEY;
var init_context_helpers = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js"() {
    init_context2();
    init_context();
    BAGGAGE_KEY = createContextKey("OpenTelemetry Baggage Key");
  }
});

// node_modules/@opentelemetry/api/build/esm/api/propagation.js
var API_NAME4, NOOP_TEXT_MAP_PROPAGATOR, PropagationAPI;
var init_propagation = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/propagation.js"() {
    init_global_utils();
    init_NoopTextMapPropagator();
    init_TextMapPropagator();
    init_context_helpers();
    init_utils();
    init_diag();
    API_NAME4 = "propagation";
    NOOP_TEXT_MAP_PROPAGATOR = new NoopTextMapPropagator();
    PropagationAPI = /** @class */
    (function() {
      function PropagationAPI2() {
        this.createBaggage = createBaggage;
        this.getBaggage = getBaggage;
        this.getActiveBaggage = getActiveBaggage;
        this.setBaggage = setBaggage;
        this.deleteBaggage = deleteBaggage;
      }
      PropagationAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new PropagationAPI2();
        }
        return this._instance;
      };
      PropagationAPI2.prototype.setGlobalPropagator = function(propagator) {
        return registerGlobal(API_NAME4, propagator, DiagAPI.instance());
      };
      PropagationAPI2.prototype.inject = function(context2, carrier, setter) {
        if (setter === void 0) {
          setter = defaultTextMapSetter;
        }
        return this._getGlobalPropagator().inject(context2, carrier, setter);
      };
      PropagationAPI2.prototype.extract = function(context2, carrier, getter) {
        if (getter === void 0) {
          getter = defaultTextMapGetter;
        }
        return this._getGlobalPropagator().extract(context2, carrier, getter);
      };
      PropagationAPI2.prototype.fields = function() {
        return this._getGlobalPropagator().fields();
      };
      PropagationAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME4, DiagAPI.instance());
      };
      PropagationAPI2.prototype._getGlobalPropagator = function() {
        return getGlobal(API_NAME4) || NOOP_TEXT_MAP_PROPAGATOR;
      };
      return PropagationAPI2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/propagation-api.js
var propagation;
var init_propagation_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/propagation-api.js"() {
    init_propagation();
    propagation = PropagationAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/api/trace.js
var API_NAME5, TraceAPI;
var init_trace = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/trace.js"() {
    init_global_utils();
    init_ProxyTracerProvider();
    init_spancontext_utils();
    init_context_utils();
    init_diag();
    API_NAME5 = "trace";
    TraceAPI = /** @class */
    (function() {
      function TraceAPI2() {
        this._proxyTracerProvider = new ProxyTracerProvider();
        this.wrapSpanContext = wrapSpanContext;
        this.isSpanContextValid = isSpanContextValid;
        this.deleteSpan = deleteSpan;
        this.getSpan = getSpan;
        this.getActiveSpan = getActiveSpan;
        this.getSpanContext = getSpanContext;
        this.setSpan = setSpan;
        this.setSpanContext = setSpanContext;
      }
      TraceAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new TraceAPI2();
        }
        return this._instance;
      };
      TraceAPI2.prototype.setGlobalTracerProvider = function(provider) {
        var success = registerGlobal(API_NAME5, this._proxyTracerProvider, DiagAPI.instance());
        if (success) {
          this._proxyTracerProvider.setDelegate(provider);
        }
        return success;
      };
      TraceAPI2.prototype.getTracerProvider = function() {
        return getGlobal(API_NAME5) || this._proxyTracerProvider;
      };
      TraceAPI2.prototype.getTracer = function(name, version) {
        return this.getTracerProvider().getTracer(name, version);
      };
      TraceAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME5, DiagAPI.instance());
        this._proxyTracerProvider = new ProxyTracerProvider();
      };
      return TraceAPI2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace-api.js
var trace;
var init_trace_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace-api.js"() {
    init_trace();
    trace = TraceAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/index.js
var esm_exports = {};
__export(esm_exports, {
  DiagConsoleLogger: () => DiagConsoleLogger,
  DiagLogLevel: () => DiagLogLevel,
  INVALID_SPANID: () => INVALID_SPANID,
  INVALID_SPAN_CONTEXT: () => INVALID_SPAN_CONTEXT,
  INVALID_TRACEID: () => INVALID_TRACEID,
  ProxyTracer: () => ProxyTracer,
  ProxyTracerProvider: () => ProxyTracerProvider,
  ROOT_CONTEXT: () => ROOT_CONTEXT,
  SamplingDecision: () => SamplingDecision,
  SpanKind: () => SpanKind,
  SpanStatusCode: () => SpanStatusCode,
  TraceFlags: () => TraceFlags,
  ValueType: () => ValueType,
  baggageEntryMetadataFromString: () => baggageEntryMetadataFromString,
  context: () => context,
  createContextKey: () => createContextKey,
  createNoopMeter: () => createNoopMeter,
  createTraceState: () => createTraceState,
  default: () => esm_default,
  defaultTextMapGetter: () => defaultTextMapGetter,
  defaultTextMapSetter: () => defaultTextMapSetter,
  diag: () => diag2,
  isSpanContextValid: () => isSpanContextValid,
  isValidSpanId: () => isValidSpanId,
  isValidTraceId: () => isValidTraceId,
  metrics: () => metrics,
  propagation: () => propagation,
  trace: () => trace
});
var esm_default;
var init_esm = __esm({
  "node_modules/@opentelemetry/api/build/esm/index.js"() {
    init_utils();
    init_context();
    init_consoleLogger();
    init_types();
    init_NoopMeter();
    init_Metric();
    init_TextMapPropagator();
    init_ProxyTracer();
    init_ProxyTracerProvider();
    init_SamplingResult();
    init_span_kind();
    init_status();
    init_trace_flags();
    init_utils2();
    init_spancontext_utils();
    init_invalid_span_constants();
    init_context_api();
    init_diag_api();
    init_metrics_api();
    init_propagation_api();
    init_trace_api();
    esm_default = {
      context,
      diag: diag2,
      metrics,
      propagation,
      trace
    };
  }
});

// node_modules/@opentelemetry/core/build/src/trace/suppress-tracing.js
var require_suppress_tracing = __commonJS({
  "node_modules/@opentelemetry/core/build/src/trace/suppress-tracing.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isTracingSuppressed = exports2.unsuppressTracing = exports2.suppressTracing = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var SUPPRESS_TRACING_KEY = (0, api_1.createContextKey)("OpenTelemetry SDK Context Key SUPPRESS_TRACING");
    function suppressTracing(context2) {
      return context2.setValue(SUPPRESS_TRACING_KEY, true);
    }
    exports2.suppressTracing = suppressTracing;
    function unsuppressTracing(context2) {
      return context2.deleteValue(SUPPRESS_TRACING_KEY);
    }
    exports2.unsuppressTracing = unsuppressTracing;
    function isTracingSuppressed(context2) {
      return context2.getValue(SUPPRESS_TRACING_KEY) === true;
    }
    exports2.isTracingSuppressed = isTracingSuppressed;
  }
});

// node_modules/@opentelemetry/core/build/src/baggage/constants.js
var require_constants3 = __commonJS({
  "node_modules/@opentelemetry/core/build/src/baggage/constants.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BAGGAGE_MAX_TOTAL_LENGTH = exports2.BAGGAGE_MAX_PER_NAME_VALUE_PAIRS = exports2.BAGGAGE_MAX_NAME_VALUE_PAIRS = exports2.BAGGAGE_HEADER = exports2.BAGGAGE_ITEMS_SEPARATOR = exports2.BAGGAGE_PROPERTIES_SEPARATOR = exports2.BAGGAGE_KEY_PAIR_SEPARATOR = void 0;
    exports2.BAGGAGE_KEY_PAIR_SEPARATOR = "=";
    exports2.BAGGAGE_PROPERTIES_SEPARATOR = ";";
    exports2.BAGGAGE_ITEMS_SEPARATOR = ",";
    exports2.BAGGAGE_HEADER = "baggage";
    exports2.BAGGAGE_MAX_NAME_VALUE_PAIRS = 180;
    exports2.BAGGAGE_MAX_PER_NAME_VALUE_PAIRS = 4096;
    exports2.BAGGAGE_MAX_TOTAL_LENGTH = 8192;
  }
});

// node_modules/@opentelemetry/core/build/src/baggage/utils.js
var require_utils = __commonJS({
  "node_modules/@opentelemetry/core/build/src/baggage/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.parseKeyPairsIntoRecord = exports2.parsePairKeyValue = exports2.getKeyPairs = exports2.serializeKeyPairs = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var constants_1 = require_constants3();
    function serializeKeyPairs(keyPairs) {
      return keyPairs.reduce((hValue, current) => {
        const value = `${hValue}${hValue !== "" ? constants_1.BAGGAGE_ITEMS_SEPARATOR : ""}${current}`;
        return value.length > constants_1.BAGGAGE_MAX_TOTAL_LENGTH ? hValue : value;
      }, "");
    }
    exports2.serializeKeyPairs = serializeKeyPairs;
    function getKeyPairs(baggage) {
      return baggage.getAllEntries().map(([key, value]) => {
        let entry = `${encodeURIComponent(key)}=${encodeURIComponent(value.value)}`;
        if (value.metadata !== void 0) {
          entry += constants_1.BAGGAGE_PROPERTIES_SEPARATOR + value.metadata.toString();
        }
        return entry;
      });
    }
    exports2.getKeyPairs = getKeyPairs;
    function parsePairKeyValue(entry) {
      const valueProps = entry.split(constants_1.BAGGAGE_PROPERTIES_SEPARATOR);
      if (valueProps.length <= 0)
        return;
      const keyPairPart = valueProps.shift();
      if (!keyPairPart)
        return;
      const separatorIndex = keyPairPart.indexOf(constants_1.BAGGAGE_KEY_PAIR_SEPARATOR);
      if (separatorIndex <= 0)
        return;
      const key = decodeURIComponent(keyPairPart.substring(0, separatorIndex).trim());
      const value = decodeURIComponent(keyPairPart.substring(separatorIndex + 1).trim());
      let metadata;
      if (valueProps.length > 0) {
        metadata = (0, api_1.baggageEntryMetadataFromString)(valueProps.join(constants_1.BAGGAGE_PROPERTIES_SEPARATOR));
      }
      return { key, value, metadata };
    }
    exports2.parsePairKeyValue = parsePairKeyValue;
    function parseKeyPairsIntoRecord(value) {
      const result = {};
      if (typeof value === "string" && value.length > 0) {
        value.split(constants_1.BAGGAGE_ITEMS_SEPARATOR).forEach((entry) => {
          const keyPair = parsePairKeyValue(entry);
          if (keyPair !== void 0 && keyPair.value.length > 0) {
            result[keyPair.key] = keyPair.value;
          }
        });
      }
      return result;
    }
    exports2.parseKeyPairsIntoRecord = parseKeyPairsIntoRecord;
  }
});

// node_modules/@opentelemetry/core/build/src/baggage/propagation/W3CBaggagePropagator.js
var require_W3CBaggagePropagator = __commonJS({
  "node_modules/@opentelemetry/core/build/src/baggage/propagation/W3CBaggagePropagator.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.W3CBaggagePropagator = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var suppress_tracing_1 = require_suppress_tracing();
    var constants_1 = require_constants3();
    var utils_1 = require_utils();
    var W3CBaggagePropagator = class {
      inject(context2, carrier, setter) {
        const baggage = api_1.propagation.getBaggage(context2);
        if (!baggage || (0, suppress_tracing_1.isTracingSuppressed)(context2))
          return;
        const keyPairs = (0, utils_1.getKeyPairs)(baggage).filter((pair) => {
          return pair.length <= constants_1.BAGGAGE_MAX_PER_NAME_VALUE_PAIRS;
        }).slice(0, constants_1.BAGGAGE_MAX_NAME_VALUE_PAIRS);
        const headerValue = (0, utils_1.serializeKeyPairs)(keyPairs);
        if (headerValue.length > 0) {
          setter.set(carrier, constants_1.BAGGAGE_HEADER, headerValue);
        }
      }
      extract(context2, carrier, getter) {
        const headerValue = getter.get(carrier, constants_1.BAGGAGE_HEADER);
        const baggageString = Array.isArray(headerValue) ? headerValue.join(constants_1.BAGGAGE_ITEMS_SEPARATOR) : headerValue;
        if (!baggageString)
          return context2;
        const baggage = {};
        if (baggageString.length === 0) {
          return context2;
        }
        const pairs = baggageString.split(constants_1.BAGGAGE_ITEMS_SEPARATOR);
        pairs.forEach((entry) => {
          const keyPair = (0, utils_1.parsePairKeyValue)(entry);
          if (keyPair) {
            const baggageEntry = { value: keyPair.value };
            if (keyPair.metadata) {
              baggageEntry.metadata = keyPair.metadata;
            }
            baggage[keyPair.key] = baggageEntry;
          }
        });
        if (Object.entries(baggage).length === 0) {
          return context2;
        }
        return api_1.propagation.setBaggage(context2, api_1.propagation.createBaggage(baggage));
      }
      fields() {
        return [constants_1.BAGGAGE_HEADER];
      }
    };
    exports2.W3CBaggagePropagator = W3CBaggagePropagator;
  }
});

// node_modules/@opentelemetry/core/build/src/common/anchored-clock.js
var require_anchored_clock = __commonJS({
  "node_modules/@opentelemetry/core/build/src/common/anchored-clock.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AnchoredClock = void 0;
    var AnchoredClock = class {
      _monotonicClock;
      _epochMillis;
      _performanceMillis;
      /**
       * Create a new AnchoredClock anchored to the current time returned by systemClock.
       *
       * @param systemClock should be a clock that returns the number of milliseconds since January 1 1970 such as Date
       * @param monotonicClock should be a clock that counts milliseconds monotonically such as window.performance or perf_hooks.performance
       */
      constructor(systemClock, monotonicClock) {
        this._monotonicClock = monotonicClock;
        this._epochMillis = systemClock.now();
        this._performanceMillis = monotonicClock.now();
      }
      /**
       * Returns the current time by adding the number of milliseconds since the
       * AnchoredClock was created to the creation epoch time
       */
      now() {
        const delta = this._monotonicClock.now() - this._performanceMillis;
        return this._epochMillis + delta;
      }
    };
    exports2.AnchoredClock = AnchoredClock;
  }
});

// node_modules/@opentelemetry/core/build/src/common/attributes.js
var require_attributes = __commonJS({
  "node_modules/@opentelemetry/core/build/src/common/attributes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isAttributeValue = exports2.isAttributeKey = exports2.sanitizeAttributes = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    function sanitizeAttributes(attributes) {
      const out = {};
      if (typeof attributes !== "object" || attributes == null) {
        return out;
      }
      for (const key in attributes) {
        if (!Object.prototype.hasOwnProperty.call(attributes, key)) {
          continue;
        }
        if (!isAttributeKey(key)) {
          api_1.diag.warn(`Invalid attribute key: ${key}`);
          continue;
        }
        const val = attributes[key];
        if (!isAttributeValue(val)) {
          api_1.diag.warn(`Invalid attribute value set for key: ${key}`);
          continue;
        }
        if (Array.isArray(val)) {
          out[key] = val.slice();
        } else {
          out[key] = val;
        }
      }
      return out;
    }
    exports2.sanitizeAttributes = sanitizeAttributes;
    function isAttributeKey(key) {
      return typeof key === "string" && key !== "";
    }
    exports2.isAttributeKey = isAttributeKey;
    function isAttributeValue(val) {
      if (val == null) {
        return true;
      }
      if (Array.isArray(val)) {
        return isHomogeneousAttributeValueArray(val);
      }
      return isValidPrimitiveAttributeValueType(typeof val);
    }
    exports2.isAttributeValue = isAttributeValue;
    function isHomogeneousAttributeValueArray(arr) {
      let type;
      for (const element of arr) {
        if (element == null)
          continue;
        const elementType = typeof element;
        if (elementType === type) {
          continue;
        }
        if (!type) {
          if (isValidPrimitiveAttributeValueType(elementType)) {
            type = elementType;
            continue;
          }
          return false;
        }
        return false;
      }
      return true;
    }
    function isValidPrimitiveAttributeValueType(valType) {
      switch (valType) {
        case "number":
        case "boolean":
        case "string":
          return true;
      }
      return false;
    }
  }
});

// node_modules/@opentelemetry/core/build/src/common/logging-error-handler.js
var require_logging_error_handler = __commonJS({
  "node_modules/@opentelemetry/core/build/src/common/logging-error-handler.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.loggingErrorHandler = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    function loggingErrorHandler() {
      return (ex) => {
        api_1.diag.error(stringifyException(ex));
      };
    }
    exports2.loggingErrorHandler = loggingErrorHandler;
    function stringifyException(ex) {
      if (typeof ex === "string") {
        return ex;
      } else {
        return JSON.stringify(flattenException(ex));
      }
    }
    function flattenException(ex) {
      const result = {};
      let current = ex;
      while (current !== null) {
        Object.getOwnPropertyNames(current).forEach((propertyName) => {
          if (result[propertyName])
            return;
          const value = current[propertyName];
          if (value) {
            result[propertyName] = String(value);
          }
        });
        current = Object.getPrototypeOf(current);
      }
      return result;
    }
  }
});

// node_modules/@opentelemetry/core/build/src/common/global-error-handler.js
var require_global_error_handler = __commonJS({
  "node_modules/@opentelemetry/core/build/src/common/global-error-handler.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.globalErrorHandler = exports2.setGlobalErrorHandler = void 0;
    var logging_error_handler_1 = require_logging_error_handler();
    var delegateHandler = (0, logging_error_handler_1.loggingErrorHandler)();
    function setGlobalErrorHandler(handler2) {
      delegateHandler = handler2;
    }
    exports2.setGlobalErrorHandler = setGlobalErrorHandler;
    function globalErrorHandler(ex) {
      try {
        delegateHandler(ex);
      } catch {
      }
    }
    exports2.globalErrorHandler = globalErrorHandler;
  }
});

// node_modules/@opentelemetry/core/build/src/platform/node/environment.js
var require_environment = __commonJS({
  "node_modules/@opentelemetry/core/build/src/platform/node/environment.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getStringListFromEnv = exports2.getBooleanFromEnv = exports2.getStringFromEnv = exports2.getNumberFromEnv = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var util_1 = require("util");
    function getNumberFromEnv(key) {
      const raw = process.env[key];
      if (raw == null || raw.trim() === "") {
        return void 0;
      }
      const value = Number(raw);
      if (isNaN(value)) {
        api_1.diag.warn(`Unknown value ${(0, util_1.inspect)(raw)} for ${key}, expected a number, using defaults`);
        return void 0;
      }
      return value;
    }
    exports2.getNumberFromEnv = getNumberFromEnv;
    function getStringFromEnv(key) {
      const raw = process.env[key];
      if (raw == null || raw.trim() === "") {
        return void 0;
      }
      return raw;
    }
    exports2.getStringFromEnv = getStringFromEnv;
    function getBooleanFromEnv(key) {
      const raw = process.env[key]?.trim().toLowerCase();
      if (raw == null || raw === "") {
        return false;
      }
      if (raw === "true") {
        return true;
      } else if (raw === "false") {
        return false;
      } else {
        api_1.diag.warn(`Unknown value ${(0, util_1.inspect)(raw)} for ${key}, expected 'true' or 'false', falling back to 'false' (default)`);
        return false;
      }
    }
    exports2.getBooleanFromEnv = getBooleanFromEnv;
    function getStringListFromEnv(key) {
      return getStringFromEnv(key)?.split(",").map((v) => v.trim()).filter((s) => s !== "");
    }
    exports2.getStringListFromEnv = getStringListFromEnv;
  }
});

// node_modules/@opentelemetry/core/build/src/platform/node/globalThis.js
var require_globalThis = __commonJS({
  "node_modules/@opentelemetry/core/build/src/platform/node/globalThis.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2._globalThis = void 0;
    exports2._globalThis = typeof globalThis === "object" ? globalThis : global;
  }
});

// node_modules/@opentelemetry/core/build/src/platform/node/performance.js
var require_performance = __commonJS({
  "node_modules/@opentelemetry/core/build/src/platform/node/performance.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.otperformance = void 0;
    var perf_hooks_1 = require("perf_hooks");
    exports2.otperformance = perf_hooks_1.performance;
  }
});

// node_modules/@opentelemetry/core/build/src/version.js
var require_version2 = __commonJS({
  "node_modules/@opentelemetry/core/build/src/version.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.VERSION = void 0;
    exports2.VERSION = "2.2.0";
  }
});

// node_modules/@opentelemetry/semantic-conventions/build/esm/internal/utils.js
// @__NO_SIDE_EFFECTS__
function createConstMap(values) {
  let res = {};
  const len = values.length;
  for (let lp = 0; lp < len; lp++) {
    const val = values[lp];
    if (val) {
      res[String(val).toUpperCase().replace(/[-.]/g, "_")] = val;
    }
  }
  return res;
}
var init_utils3 = __esm({
  "node_modules/@opentelemetry/semantic-conventions/build/esm/internal/utils.js"() {
  }
});

// node_modules/@opentelemetry/semantic-conventions/build/esm/trace/SemanticAttributes.js
var TMP_AWS_LAMBDA_INVOKED_ARN, TMP_DB_SYSTEM, TMP_DB_CONNECTION_STRING, TMP_DB_USER, TMP_DB_JDBC_DRIVER_CLASSNAME, TMP_DB_NAME, TMP_DB_STATEMENT, TMP_DB_OPERATION, TMP_DB_MSSQL_INSTANCE_NAME, TMP_DB_CASSANDRA_KEYSPACE, TMP_DB_CASSANDRA_PAGE_SIZE, TMP_DB_CASSANDRA_CONSISTENCY_LEVEL, TMP_DB_CASSANDRA_TABLE, TMP_DB_CASSANDRA_IDEMPOTENCE, TMP_DB_CASSANDRA_SPECULATIVE_EXECUTION_COUNT, TMP_DB_CASSANDRA_COORDINATOR_ID, TMP_DB_CASSANDRA_COORDINATOR_DC, TMP_DB_HBASE_NAMESPACE, TMP_DB_REDIS_DATABASE_INDEX, TMP_DB_MONGODB_COLLECTION, TMP_DB_SQL_TABLE, TMP_EXCEPTION_TYPE, TMP_EXCEPTION_MESSAGE, TMP_EXCEPTION_STACKTRACE, TMP_EXCEPTION_ESCAPED, TMP_FAAS_TRIGGER, TMP_FAAS_EXECUTION, TMP_FAAS_DOCUMENT_COLLECTION, TMP_FAAS_DOCUMENT_OPERATION, TMP_FAAS_DOCUMENT_TIME, TMP_FAAS_DOCUMENT_NAME, TMP_FAAS_TIME, TMP_FAAS_CRON, TMP_FAAS_COLDSTART, TMP_FAAS_INVOKED_NAME, TMP_FAAS_INVOKED_PROVIDER, TMP_FAAS_INVOKED_REGION, TMP_NET_TRANSPORT, TMP_NET_PEER_IP, TMP_NET_PEER_PORT, TMP_NET_PEER_NAME, TMP_NET_HOST_IP, TMP_NET_HOST_PORT, TMP_NET_HOST_NAME, TMP_NET_HOST_CONNECTION_TYPE, TMP_NET_HOST_CONNECTION_SUBTYPE, TMP_NET_HOST_CARRIER_NAME, TMP_NET_HOST_CARRIER_MCC, TMP_NET_HOST_CARRIER_MNC, TMP_NET_HOST_CARRIER_ICC, TMP_PEER_SERVICE, TMP_ENDUSER_ID, TMP_ENDUSER_ROLE, TMP_ENDUSER_SCOPE, TMP_THREAD_ID, TMP_THREAD_NAME, TMP_CODE_FUNCTION, TMP_CODE_NAMESPACE, TMP_CODE_FILEPATH, TMP_CODE_LINENO, TMP_HTTP_METHOD, TMP_HTTP_URL, TMP_HTTP_TARGET, TMP_HTTP_HOST, TMP_HTTP_SCHEME, TMP_HTTP_STATUS_CODE, TMP_HTTP_FLAVOR, TMP_HTTP_USER_AGENT, TMP_HTTP_REQUEST_CONTENT_LENGTH, TMP_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED, TMP_HTTP_RESPONSE_CONTENT_LENGTH, TMP_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED, TMP_HTTP_SERVER_NAME, TMP_HTTP_ROUTE, TMP_HTTP_CLIENT_IP, TMP_AWS_DYNAMODB_TABLE_NAMES, TMP_AWS_DYNAMODB_CONSUMED_CAPACITY, TMP_AWS_DYNAMODB_ITEM_COLLECTION_METRICS, TMP_AWS_DYNAMODB_PROVISIONED_READ_CAPACITY, TMP_AWS_DYNAMODB_PROVISIONED_WRITE_CAPACITY, TMP_AWS_DYNAMODB_CONSISTENT_READ, TMP_AWS_DYNAMODB_PROJECTION, TMP_AWS_DYNAMODB_LIMIT, TMP_AWS_DYNAMODB_ATTRIBUTES_TO_GET, TMP_AWS_DYNAMODB_INDEX_NAME, TMP_AWS_DYNAMODB_SELECT, TMP_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEXES, TMP_AWS_DYNAMODB_LOCAL_SECONDARY_INDEXES, TMP_AWS_DYNAMODB_EXCLUSIVE_START_TABLE, TMP_AWS_DYNAMODB_TABLE_COUNT, TMP_AWS_DYNAMODB_SCAN_FORWARD, TMP_AWS_DYNAMODB_SEGMENT, TMP_AWS_DYNAMODB_TOTAL_SEGMENTS, TMP_AWS_DYNAMODB_COUNT, TMP_AWS_DYNAMODB_SCANNED_COUNT, TMP_AWS_DYNAMODB_ATTRIBUTE_DEFINITIONS, TMP_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEX_UPDATES, TMP_MESSAGING_SYSTEM, TMP_MESSAGING_DESTINATION, TMP_MESSAGING_DESTINATION_KIND, TMP_MESSAGING_TEMP_DESTINATION, TMP_MESSAGING_PROTOCOL, TMP_MESSAGING_PROTOCOL_VERSION, TMP_MESSAGING_URL, TMP_MESSAGING_MESSAGE_ID, TMP_MESSAGING_CONVERSATION_ID, TMP_MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES, TMP_MESSAGING_MESSAGE_PAYLOAD_COMPRESSED_SIZE_BYTES, TMP_MESSAGING_OPERATION, TMP_MESSAGING_CONSUMER_ID, TMP_MESSAGING_RABBITMQ_ROUTING_KEY, TMP_MESSAGING_KAFKA_MESSAGE_KEY, TMP_MESSAGING_KAFKA_CONSUMER_GROUP, TMP_MESSAGING_KAFKA_CLIENT_ID, TMP_MESSAGING_KAFKA_PARTITION, TMP_MESSAGING_KAFKA_TOMBSTONE, TMP_RPC_SYSTEM, TMP_RPC_SERVICE, TMP_RPC_METHOD, TMP_RPC_GRPC_STATUS_CODE, TMP_RPC_JSONRPC_VERSION, TMP_RPC_JSONRPC_REQUEST_ID, TMP_RPC_JSONRPC_ERROR_CODE, TMP_RPC_JSONRPC_ERROR_MESSAGE, TMP_MESSAGE_TYPE, TMP_MESSAGE_ID, TMP_MESSAGE_COMPRESSED_SIZE, TMP_MESSAGE_UNCOMPRESSED_SIZE, SEMATTRS_AWS_LAMBDA_INVOKED_ARN, SEMATTRS_DB_SYSTEM, SEMATTRS_DB_CONNECTION_STRING, SEMATTRS_DB_USER, SEMATTRS_DB_JDBC_DRIVER_CLASSNAME, SEMATTRS_DB_NAME, SEMATTRS_DB_STATEMENT, SEMATTRS_DB_OPERATION, SEMATTRS_DB_MSSQL_INSTANCE_NAME, SEMATTRS_DB_CASSANDRA_KEYSPACE, SEMATTRS_DB_CASSANDRA_PAGE_SIZE, SEMATTRS_DB_CASSANDRA_CONSISTENCY_LEVEL, SEMATTRS_DB_CASSANDRA_TABLE, SEMATTRS_DB_CASSANDRA_IDEMPOTENCE, SEMATTRS_DB_CASSANDRA_SPECULATIVE_EXECUTION_COUNT, SEMATTRS_DB_CASSANDRA_COORDINATOR_ID, SEMATTRS_DB_CASSANDRA_COORDINATOR_DC, SEMATTRS_DB_HBASE_NAMESPACE, SEMATTRS_DB_REDIS_DATABASE_INDEX, SEMATTRS_DB_MONGODB_COLLECTION, SEMATTRS_DB_SQL_TABLE, SEMATTRS_EXCEPTION_TYPE, SEMATTRS_EXCEPTION_MESSAGE, SEMATTRS_EXCEPTION_STACKTRACE, SEMATTRS_EXCEPTION_ESCAPED, SEMATTRS_FAAS_TRIGGER, SEMATTRS_FAAS_EXECUTION, SEMATTRS_FAAS_DOCUMENT_COLLECTION, SEMATTRS_FAAS_DOCUMENT_OPERATION, SEMATTRS_FAAS_DOCUMENT_TIME, SEMATTRS_FAAS_DOCUMENT_NAME, SEMATTRS_FAAS_TIME, SEMATTRS_FAAS_CRON, SEMATTRS_FAAS_COLDSTART, SEMATTRS_FAAS_INVOKED_NAME, SEMATTRS_FAAS_INVOKED_PROVIDER, SEMATTRS_FAAS_INVOKED_REGION, SEMATTRS_NET_TRANSPORT, SEMATTRS_NET_PEER_IP, SEMATTRS_NET_PEER_PORT, SEMATTRS_NET_PEER_NAME, SEMATTRS_NET_HOST_IP, SEMATTRS_NET_HOST_PORT, SEMATTRS_NET_HOST_NAME, SEMATTRS_NET_HOST_CONNECTION_TYPE, SEMATTRS_NET_HOST_CONNECTION_SUBTYPE, SEMATTRS_NET_HOST_CARRIER_NAME, SEMATTRS_NET_HOST_CARRIER_MCC, SEMATTRS_NET_HOST_CARRIER_MNC, SEMATTRS_NET_HOST_CARRIER_ICC, SEMATTRS_PEER_SERVICE, SEMATTRS_ENDUSER_ID, SEMATTRS_ENDUSER_ROLE, SEMATTRS_ENDUSER_SCOPE, SEMATTRS_THREAD_ID, SEMATTRS_THREAD_NAME, SEMATTRS_CODE_FUNCTION, SEMATTRS_CODE_NAMESPACE, SEMATTRS_CODE_FILEPATH, SEMATTRS_CODE_LINENO, SEMATTRS_HTTP_METHOD, SEMATTRS_HTTP_URL, SEMATTRS_HTTP_TARGET, SEMATTRS_HTTP_HOST, SEMATTRS_HTTP_SCHEME, SEMATTRS_HTTP_STATUS_CODE, SEMATTRS_HTTP_FLAVOR, SEMATTRS_HTTP_USER_AGENT, SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH, SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED, SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH, SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED, SEMATTRS_HTTP_SERVER_NAME, SEMATTRS_HTTP_ROUTE, SEMATTRS_HTTP_CLIENT_IP, SEMATTRS_AWS_DYNAMODB_TABLE_NAMES, SEMATTRS_AWS_DYNAMODB_CONSUMED_CAPACITY, SEMATTRS_AWS_DYNAMODB_ITEM_COLLECTION_METRICS, SEMATTRS_AWS_DYNAMODB_PROVISIONED_READ_CAPACITY, SEMATTRS_AWS_DYNAMODB_PROVISIONED_WRITE_CAPACITY, SEMATTRS_AWS_DYNAMODB_CONSISTENT_READ, SEMATTRS_AWS_DYNAMODB_PROJECTION, SEMATTRS_AWS_DYNAMODB_LIMIT, SEMATTRS_AWS_DYNAMODB_ATTRIBUTES_TO_GET, SEMATTRS_AWS_DYNAMODB_INDEX_NAME, SEMATTRS_AWS_DYNAMODB_SELECT, SEMATTRS_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEXES, SEMATTRS_AWS_DYNAMODB_LOCAL_SECONDARY_INDEXES, SEMATTRS_AWS_DYNAMODB_EXCLUSIVE_START_TABLE, SEMATTRS_AWS_DYNAMODB_TABLE_COUNT, SEMATTRS_AWS_DYNAMODB_SCAN_FORWARD, SEMATTRS_AWS_DYNAMODB_SEGMENT, SEMATTRS_AWS_DYNAMODB_TOTAL_SEGMENTS, SEMATTRS_AWS_DYNAMODB_COUNT, SEMATTRS_AWS_DYNAMODB_SCANNED_COUNT, SEMATTRS_AWS_DYNAMODB_ATTRIBUTE_DEFINITIONS, SEMATTRS_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEX_UPDATES, SEMATTRS_MESSAGING_SYSTEM, SEMATTRS_MESSAGING_DESTINATION, SEMATTRS_MESSAGING_DESTINATION_KIND, SEMATTRS_MESSAGING_TEMP_DESTINATION, SEMATTRS_MESSAGING_PROTOCOL, SEMATTRS_MESSAGING_PROTOCOL_VERSION, SEMATTRS_MESSAGING_URL, SEMATTRS_MESSAGING_MESSAGE_ID, SEMATTRS_MESSAGING_CONVERSATION_ID, SEMATTRS_MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES, SEMATTRS_MESSAGING_MESSAGE_PAYLOAD_COMPRESSED_SIZE_BYTES, SEMATTRS_MESSAGING_OPERATION, SEMATTRS_MESSAGING_CONSUMER_ID, SEMATTRS_MESSAGING_RABBITMQ_ROUTING_KEY, SEMATTRS_MESSAGING_KAFKA_MESSAGE_KEY, SEMATTRS_MESSAGING_KAFKA_CONSUMER_GROUP, SEMATTRS_MESSAGING_KAFKA_CLIENT_ID, SEMATTRS_MESSAGING_KAFKA_PARTITION, SEMATTRS_MESSAGING_KAFKA_TOMBSTONE, SEMATTRS_RPC_SYSTEM, SEMATTRS_RPC_SERVICE, SEMATTRS_RPC_METHOD, SEMATTRS_RPC_GRPC_STATUS_CODE, SEMATTRS_RPC_JSONRPC_VERSION, SEMATTRS_RPC_JSONRPC_REQUEST_ID, SEMATTRS_RPC_JSONRPC_ERROR_CODE, SEMATTRS_RPC_JSONRPC_ERROR_MESSAGE, SEMATTRS_MESSAGE_TYPE, SEMATTRS_MESSAGE_ID, SEMATTRS_MESSAGE_COMPRESSED_SIZE, SEMATTRS_MESSAGE_UNCOMPRESSED_SIZE, SemanticAttributes, TMP_DBSYSTEMVALUES_OTHER_SQL, TMP_DBSYSTEMVALUES_MSSQL, TMP_DBSYSTEMVALUES_MYSQL, TMP_DBSYSTEMVALUES_ORACLE, TMP_DBSYSTEMVALUES_DB2, TMP_DBSYSTEMVALUES_POSTGRESQL, TMP_DBSYSTEMVALUES_REDSHIFT, TMP_DBSYSTEMVALUES_HIVE, TMP_DBSYSTEMVALUES_CLOUDSCAPE, TMP_DBSYSTEMVALUES_HSQLDB, TMP_DBSYSTEMVALUES_PROGRESS, TMP_DBSYSTEMVALUES_MAXDB, TMP_DBSYSTEMVALUES_HANADB, TMP_DBSYSTEMVALUES_INGRES, TMP_DBSYSTEMVALUES_FIRSTSQL, TMP_DBSYSTEMVALUES_EDB, TMP_DBSYSTEMVALUES_CACHE, TMP_DBSYSTEMVALUES_ADABAS, TMP_DBSYSTEMVALUES_FIREBIRD, TMP_DBSYSTEMVALUES_DERBY, TMP_DBSYSTEMVALUES_FILEMAKER, TMP_DBSYSTEMVALUES_INFORMIX, TMP_DBSYSTEMVALUES_INSTANTDB, TMP_DBSYSTEMVALUES_INTERBASE, TMP_DBSYSTEMVALUES_MARIADB, TMP_DBSYSTEMVALUES_NETEZZA, TMP_DBSYSTEMVALUES_PERVASIVE, TMP_DBSYSTEMVALUES_POINTBASE, TMP_DBSYSTEMVALUES_SQLITE, TMP_DBSYSTEMVALUES_SYBASE, TMP_DBSYSTEMVALUES_TERADATA, TMP_DBSYSTEMVALUES_VERTICA, TMP_DBSYSTEMVALUES_H2, TMP_DBSYSTEMVALUES_COLDFUSION, TMP_DBSYSTEMVALUES_CASSANDRA, TMP_DBSYSTEMVALUES_HBASE, TMP_DBSYSTEMVALUES_MONGODB, TMP_DBSYSTEMVALUES_REDIS, TMP_DBSYSTEMVALUES_COUCHBASE, TMP_DBSYSTEMVALUES_COUCHDB, TMP_DBSYSTEMVALUES_COSMOSDB, TMP_DBSYSTEMVALUES_DYNAMODB, TMP_DBSYSTEMVALUES_NEO4J, TMP_DBSYSTEMVALUES_GEODE, TMP_DBSYSTEMVALUES_ELASTICSEARCH, TMP_DBSYSTEMVALUES_MEMCACHED, TMP_DBSYSTEMVALUES_COCKROACHDB, DBSYSTEMVALUES_OTHER_SQL, DBSYSTEMVALUES_MSSQL, DBSYSTEMVALUES_MYSQL, DBSYSTEMVALUES_ORACLE, DBSYSTEMVALUES_DB2, DBSYSTEMVALUES_POSTGRESQL, DBSYSTEMVALUES_REDSHIFT, DBSYSTEMVALUES_HIVE, DBSYSTEMVALUES_CLOUDSCAPE, DBSYSTEMVALUES_HSQLDB, DBSYSTEMVALUES_PROGRESS, DBSYSTEMVALUES_MAXDB, DBSYSTEMVALUES_HANADB, DBSYSTEMVALUES_INGRES, DBSYSTEMVALUES_FIRSTSQL, DBSYSTEMVALUES_EDB, DBSYSTEMVALUES_CACHE, DBSYSTEMVALUES_ADABAS, DBSYSTEMVALUES_FIREBIRD, DBSYSTEMVALUES_DERBY, DBSYSTEMVALUES_FILEMAKER, DBSYSTEMVALUES_INFORMIX, DBSYSTEMVALUES_INSTANTDB, DBSYSTEMVALUES_INTERBASE, DBSYSTEMVALUES_MARIADB, DBSYSTEMVALUES_NETEZZA, DBSYSTEMVALUES_PERVASIVE, DBSYSTEMVALUES_POINTBASE, DBSYSTEMVALUES_SQLITE, DBSYSTEMVALUES_SYBASE, DBSYSTEMVALUES_TERADATA, DBSYSTEMVALUES_VERTICA, DBSYSTEMVALUES_H2, DBSYSTEMVALUES_COLDFUSION, DBSYSTEMVALUES_CASSANDRA, DBSYSTEMVALUES_HBASE, DBSYSTEMVALUES_MONGODB, DBSYSTEMVALUES_REDIS, DBSYSTEMVALUES_COUCHBASE, DBSYSTEMVALUES_COUCHDB, DBSYSTEMVALUES_COSMOSDB, DBSYSTEMVALUES_DYNAMODB, DBSYSTEMVALUES_NEO4J, DBSYSTEMVALUES_GEODE, DBSYSTEMVALUES_ELASTICSEARCH, DBSYSTEMVALUES_MEMCACHED, DBSYSTEMVALUES_COCKROACHDB, DbSystemValues, TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ALL, TMP_DBCASSANDRACONSISTENCYLEVELVALUES_EACH_QUORUM, TMP_DBCASSANDRACONSISTENCYLEVELVALUES_QUORUM, TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_QUORUM, TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ONE, TMP_DBCASSANDRACONSISTENCYLEVELVALUES_TWO, TMP_DBCASSANDRACONSISTENCYLEVELVALUES_THREE, TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_ONE, TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ANY, TMP_DBCASSANDRACONSISTENCYLEVELVALUES_SERIAL, TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_SERIAL, DBCASSANDRACONSISTENCYLEVELVALUES_ALL, DBCASSANDRACONSISTENCYLEVELVALUES_EACH_QUORUM, DBCASSANDRACONSISTENCYLEVELVALUES_QUORUM, DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_QUORUM, DBCASSANDRACONSISTENCYLEVELVALUES_ONE, DBCASSANDRACONSISTENCYLEVELVALUES_TWO, DBCASSANDRACONSISTENCYLEVELVALUES_THREE, DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_ONE, DBCASSANDRACONSISTENCYLEVELVALUES_ANY, DBCASSANDRACONSISTENCYLEVELVALUES_SERIAL, DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_SERIAL, DbCassandraConsistencyLevelValues, TMP_FAASTRIGGERVALUES_DATASOURCE, TMP_FAASTRIGGERVALUES_HTTP, TMP_FAASTRIGGERVALUES_PUBSUB, TMP_FAASTRIGGERVALUES_TIMER, TMP_FAASTRIGGERVALUES_OTHER, FAASTRIGGERVALUES_DATASOURCE, FAASTRIGGERVALUES_HTTP, FAASTRIGGERVALUES_PUBSUB, FAASTRIGGERVALUES_TIMER, FAASTRIGGERVALUES_OTHER, FaasTriggerValues, TMP_FAASDOCUMENTOPERATIONVALUES_INSERT, TMP_FAASDOCUMENTOPERATIONVALUES_EDIT, TMP_FAASDOCUMENTOPERATIONVALUES_DELETE, FAASDOCUMENTOPERATIONVALUES_INSERT, FAASDOCUMENTOPERATIONVALUES_EDIT, FAASDOCUMENTOPERATIONVALUES_DELETE, FaasDocumentOperationValues, TMP_FAASINVOKEDPROVIDERVALUES_ALIBABA_CLOUD, TMP_FAASINVOKEDPROVIDERVALUES_AWS, TMP_FAASINVOKEDPROVIDERVALUES_AZURE, TMP_FAASINVOKEDPROVIDERVALUES_GCP, FAASINVOKEDPROVIDERVALUES_ALIBABA_CLOUD, FAASINVOKEDPROVIDERVALUES_AWS, FAASINVOKEDPROVIDERVALUES_AZURE, FAASINVOKEDPROVIDERVALUES_GCP, FaasInvokedProviderValues, TMP_NETTRANSPORTVALUES_IP_TCP, TMP_NETTRANSPORTVALUES_IP_UDP, TMP_NETTRANSPORTVALUES_IP, TMP_NETTRANSPORTVALUES_UNIX, TMP_NETTRANSPORTVALUES_PIPE, TMP_NETTRANSPORTVALUES_INPROC, TMP_NETTRANSPORTVALUES_OTHER, NETTRANSPORTVALUES_IP_TCP, NETTRANSPORTVALUES_IP_UDP, NETTRANSPORTVALUES_IP, NETTRANSPORTVALUES_UNIX, NETTRANSPORTVALUES_PIPE, NETTRANSPORTVALUES_INPROC, NETTRANSPORTVALUES_OTHER, NetTransportValues, TMP_NETHOSTCONNECTIONTYPEVALUES_WIFI, TMP_NETHOSTCONNECTIONTYPEVALUES_WIRED, TMP_NETHOSTCONNECTIONTYPEVALUES_CELL, TMP_NETHOSTCONNECTIONTYPEVALUES_UNAVAILABLE, TMP_NETHOSTCONNECTIONTYPEVALUES_UNKNOWN, NETHOSTCONNECTIONTYPEVALUES_WIFI, NETHOSTCONNECTIONTYPEVALUES_WIRED, NETHOSTCONNECTIONTYPEVALUES_CELL, NETHOSTCONNECTIONTYPEVALUES_UNAVAILABLE, NETHOSTCONNECTIONTYPEVALUES_UNKNOWN, NetHostConnectionTypeValues, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_GPRS, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EDGE, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_UMTS, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_CDMA, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_0, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_A, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_CDMA2000_1XRTT, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSDPA, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSUPA, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSPA, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_IDEN, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_B, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_LTE, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EHRPD, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSPAP, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_GSM, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_TD_SCDMA, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_IWLAN, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_NR, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_NRNSA, TMP_NETHOSTCONNECTIONSUBTYPEVALUES_LTE_CA, NETHOSTCONNECTIONSUBTYPEVALUES_GPRS, NETHOSTCONNECTIONSUBTYPEVALUES_EDGE, NETHOSTCONNECTIONSUBTYPEVALUES_UMTS, NETHOSTCONNECTIONSUBTYPEVALUES_CDMA, NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_0, NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_A, NETHOSTCONNECTIONSUBTYPEVALUES_CDMA2000_1XRTT, NETHOSTCONNECTIONSUBTYPEVALUES_HSDPA, NETHOSTCONNECTIONSUBTYPEVALUES_HSUPA, NETHOSTCONNECTIONSUBTYPEVALUES_HSPA, NETHOSTCONNECTIONSUBTYPEVALUES_IDEN, NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_B, NETHOSTCONNECTIONSUBTYPEVALUES_LTE, NETHOSTCONNECTIONSUBTYPEVALUES_EHRPD, NETHOSTCONNECTIONSUBTYPEVALUES_HSPAP, NETHOSTCONNECTIONSUBTYPEVALUES_GSM, NETHOSTCONNECTIONSUBTYPEVALUES_TD_SCDMA, NETHOSTCONNECTIONSUBTYPEVALUES_IWLAN, NETHOSTCONNECTIONSUBTYPEVALUES_NR, NETHOSTCONNECTIONSUBTYPEVALUES_NRNSA, NETHOSTCONNECTIONSUBTYPEVALUES_LTE_CA, NetHostConnectionSubtypeValues, TMP_HTTPFLAVORVALUES_HTTP_1_0, TMP_HTTPFLAVORVALUES_HTTP_1_1, TMP_HTTPFLAVORVALUES_HTTP_2_0, TMP_HTTPFLAVORVALUES_SPDY, TMP_HTTPFLAVORVALUES_QUIC, HTTPFLAVORVALUES_HTTP_1_0, HTTPFLAVORVALUES_HTTP_1_1, HTTPFLAVORVALUES_HTTP_2_0, HTTPFLAVORVALUES_SPDY, HTTPFLAVORVALUES_QUIC, HttpFlavorValues, TMP_MESSAGINGDESTINATIONKINDVALUES_QUEUE, TMP_MESSAGINGDESTINATIONKINDVALUES_TOPIC, MESSAGINGDESTINATIONKINDVALUES_QUEUE, MESSAGINGDESTINATIONKINDVALUES_TOPIC, MessagingDestinationKindValues, TMP_MESSAGINGOPERATIONVALUES_RECEIVE, TMP_MESSAGINGOPERATIONVALUES_PROCESS, MESSAGINGOPERATIONVALUES_RECEIVE, MESSAGINGOPERATIONVALUES_PROCESS, MessagingOperationValues, TMP_RPCGRPCSTATUSCODEVALUES_OK, TMP_RPCGRPCSTATUSCODEVALUES_CANCELLED, TMP_RPCGRPCSTATUSCODEVALUES_UNKNOWN, TMP_RPCGRPCSTATUSCODEVALUES_INVALID_ARGUMENT, TMP_RPCGRPCSTATUSCODEVALUES_DEADLINE_EXCEEDED, TMP_RPCGRPCSTATUSCODEVALUES_NOT_FOUND, TMP_RPCGRPCSTATUSCODEVALUES_ALREADY_EXISTS, TMP_RPCGRPCSTATUSCODEVALUES_PERMISSION_DENIED, TMP_RPCGRPCSTATUSCODEVALUES_RESOURCE_EXHAUSTED, TMP_RPCGRPCSTATUSCODEVALUES_FAILED_PRECONDITION, TMP_RPCGRPCSTATUSCODEVALUES_ABORTED, TMP_RPCGRPCSTATUSCODEVALUES_OUT_OF_RANGE, TMP_RPCGRPCSTATUSCODEVALUES_UNIMPLEMENTED, TMP_RPCGRPCSTATUSCODEVALUES_INTERNAL, TMP_RPCGRPCSTATUSCODEVALUES_UNAVAILABLE, TMP_RPCGRPCSTATUSCODEVALUES_DATA_LOSS, TMP_RPCGRPCSTATUSCODEVALUES_UNAUTHENTICATED, RPCGRPCSTATUSCODEVALUES_OK, RPCGRPCSTATUSCODEVALUES_CANCELLED, RPCGRPCSTATUSCODEVALUES_UNKNOWN, RPCGRPCSTATUSCODEVALUES_INVALID_ARGUMENT, RPCGRPCSTATUSCODEVALUES_DEADLINE_EXCEEDED, RPCGRPCSTATUSCODEVALUES_NOT_FOUND, RPCGRPCSTATUSCODEVALUES_ALREADY_EXISTS, RPCGRPCSTATUSCODEVALUES_PERMISSION_DENIED, RPCGRPCSTATUSCODEVALUES_RESOURCE_EXHAUSTED, RPCGRPCSTATUSCODEVALUES_FAILED_PRECONDITION, RPCGRPCSTATUSCODEVALUES_ABORTED, RPCGRPCSTATUSCODEVALUES_OUT_OF_RANGE, RPCGRPCSTATUSCODEVALUES_UNIMPLEMENTED, RPCGRPCSTATUSCODEVALUES_INTERNAL, RPCGRPCSTATUSCODEVALUES_UNAVAILABLE, RPCGRPCSTATUSCODEVALUES_DATA_LOSS, RPCGRPCSTATUSCODEVALUES_UNAUTHENTICATED, RpcGrpcStatusCodeValues, TMP_MESSAGETYPEVALUES_SENT, TMP_MESSAGETYPEVALUES_RECEIVED, MESSAGETYPEVALUES_SENT, MESSAGETYPEVALUES_RECEIVED, MessageTypeValues;
var init_SemanticAttributes = __esm({
  "node_modules/@opentelemetry/semantic-conventions/build/esm/trace/SemanticAttributes.js"() {
    init_utils3();
    TMP_AWS_LAMBDA_INVOKED_ARN = "aws.lambda.invoked_arn";
    TMP_DB_SYSTEM = "db.system";
    TMP_DB_CONNECTION_STRING = "db.connection_string";
    TMP_DB_USER = "db.user";
    TMP_DB_JDBC_DRIVER_CLASSNAME = "db.jdbc.driver_classname";
    TMP_DB_NAME = "db.name";
    TMP_DB_STATEMENT = "db.statement";
    TMP_DB_OPERATION = "db.operation";
    TMP_DB_MSSQL_INSTANCE_NAME = "db.mssql.instance_name";
    TMP_DB_CASSANDRA_KEYSPACE = "db.cassandra.keyspace";
    TMP_DB_CASSANDRA_PAGE_SIZE = "db.cassandra.page_size";
    TMP_DB_CASSANDRA_CONSISTENCY_LEVEL = "db.cassandra.consistency_level";
    TMP_DB_CASSANDRA_TABLE = "db.cassandra.table";
    TMP_DB_CASSANDRA_IDEMPOTENCE = "db.cassandra.idempotence";
    TMP_DB_CASSANDRA_SPECULATIVE_EXECUTION_COUNT = "db.cassandra.speculative_execution_count";
    TMP_DB_CASSANDRA_COORDINATOR_ID = "db.cassandra.coordinator.id";
    TMP_DB_CASSANDRA_COORDINATOR_DC = "db.cassandra.coordinator.dc";
    TMP_DB_HBASE_NAMESPACE = "db.hbase.namespace";
    TMP_DB_REDIS_DATABASE_INDEX = "db.redis.database_index";
    TMP_DB_MONGODB_COLLECTION = "db.mongodb.collection";
    TMP_DB_SQL_TABLE = "db.sql.table";
    TMP_EXCEPTION_TYPE = "exception.type";
    TMP_EXCEPTION_MESSAGE = "exception.message";
    TMP_EXCEPTION_STACKTRACE = "exception.stacktrace";
    TMP_EXCEPTION_ESCAPED = "exception.escaped";
    TMP_FAAS_TRIGGER = "faas.trigger";
    TMP_FAAS_EXECUTION = "faas.execution";
    TMP_FAAS_DOCUMENT_COLLECTION = "faas.document.collection";
    TMP_FAAS_DOCUMENT_OPERATION = "faas.document.operation";
    TMP_FAAS_DOCUMENT_TIME = "faas.document.time";
    TMP_FAAS_DOCUMENT_NAME = "faas.document.name";
    TMP_FAAS_TIME = "faas.time";
    TMP_FAAS_CRON = "faas.cron";
    TMP_FAAS_COLDSTART = "faas.coldstart";
    TMP_FAAS_INVOKED_NAME = "faas.invoked_name";
    TMP_FAAS_INVOKED_PROVIDER = "faas.invoked_provider";
    TMP_FAAS_INVOKED_REGION = "faas.invoked_region";
    TMP_NET_TRANSPORT = "net.transport";
    TMP_NET_PEER_IP = "net.peer.ip";
    TMP_NET_PEER_PORT = "net.peer.port";
    TMP_NET_PEER_NAME = "net.peer.name";
    TMP_NET_HOST_IP = "net.host.ip";
    TMP_NET_HOST_PORT = "net.host.port";
    TMP_NET_HOST_NAME = "net.host.name";
    TMP_NET_HOST_CONNECTION_TYPE = "net.host.connection.type";
    TMP_NET_HOST_CONNECTION_SUBTYPE = "net.host.connection.subtype";
    TMP_NET_HOST_CARRIER_NAME = "net.host.carrier.name";
    TMP_NET_HOST_CARRIER_MCC = "net.host.carrier.mcc";
    TMP_NET_HOST_CARRIER_MNC = "net.host.carrier.mnc";
    TMP_NET_HOST_CARRIER_ICC = "net.host.carrier.icc";
    TMP_PEER_SERVICE = "peer.service";
    TMP_ENDUSER_ID = "enduser.id";
    TMP_ENDUSER_ROLE = "enduser.role";
    TMP_ENDUSER_SCOPE = "enduser.scope";
    TMP_THREAD_ID = "thread.id";
    TMP_THREAD_NAME = "thread.name";
    TMP_CODE_FUNCTION = "code.function";
    TMP_CODE_NAMESPACE = "code.namespace";
    TMP_CODE_FILEPATH = "code.filepath";
    TMP_CODE_LINENO = "code.lineno";
    TMP_HTTP_METHOD = "http.method";
    TMP_HTTP_URL = "http.url";
    TMP_HTTP_TARGET = "http.target";
    TMP_HTTP_HOST = "http.host";
    TMP_HTTP_SCHEME = "http.scheme";
    TMP_HTTP_STATUS_CODE = "http.status_code";
    TMP_HTTP_FLAVOR = "http.flavor";
    TMP_HTTP_USER_AGENT = "http.user_agent";
    TMP_HTTP_REQUEST_CONTENT_LENGTH = "http.request_content_length";
    TMP_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED = "http.request_content_length_uncompressed";
    TMP_HTTP_RESPONSE_CONTENT_LENGTH = "http.response_content_length";
    TMP_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED = "http.response_content_length_uncompressed";
    TMP_HTTP_SERVER_NAME = "http.server_name";
    TMP_HTTP_ROUTE = "http.route";
    TMP_HTTP_CLIENT_IP = "http.client_ip";
    TMP_AWS_DYNAMODB_TABLE_NAMES = "aws.dynamodb.table_names";
    TMP_AWS_DYNAMODB_CONSUMED_CAPACITY = "aws.dynamodb.consumed_capacity";
    TMP_AWS_DYNAMODB_ITEM_COLLECTION_METRICS = "aws.dynamodb.item_collection_metrics";
    TMP_AWS_DYNAMODB_PROVISIONED_READ_CAPACITY = "aws.dynamodb.provisioned_read_capacity";
    TMP_AWS_DYNAMODB_PROVISIONED_WRITE_CAPACITY = "aws.dynamodb.provisioned_write_capacity";
    TMP_AWS_DYNAMODB_CONSISTENT_READ = "aws.dynamodb.consistent_read";
    TMP_AWS_DYNAMODB_PROJECTION = "aws.dynamodb.projection";
    TMP_AWS_DYNAMODB_LIMIT = "aws.dynamodb.limit";
    TMP_AWS_DYNAMODB_ATTRIBUTES_TO_GET = "aws.dynamodb.attributes_to_get";
    TMP_AWS_DYNAMODB_INDEX_NAME = "aws.dynamodb.index_name";
    TMP_AWS_DYNAMODB_SELECT = "aws.dynamodb.select";
    TMP_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEXES = "aws.dynamodb.global_secondary_indexes";
    TMP_AWS_DYNAMODB_LOCAL_SECONDARY_INDEXES = "aws.dynamodb.local_secondary_indexes";
    TMP_AWS_DYNAMODB_EXCLUSIVE_START_TABLE = "aws.dynamodb.exclusive_start_table";
    TMP_AWS_DYNAMODB_TABLE_COUNT = "aws.dynamodb.table_count";
    TMP_AWS_DYNAMODB_SCAN_FORWARD = "aws.dynamodb.scan_forward";
    TMP_AWS_DYNAMODB_SEGMENT = "aws.dynamodb.segment";
    TMP_AWS_DYNAMODB_TOTAL_SEGMENTS = "aws.dynamodb.total_segments";
    TMP_AWS_DYNAMODB_COUNT = "aws.dynamodb.count";
    TMP_AWS_DYNAMODB_SCANNED_COUNT = "aws.dynamodb.scanned_count";
    TMP_AWS_DYNAMODB_ATTRIBUTE_DEFINITIONS = "aws.dynamodb.attribute_definitions";
    TMP_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEX_UPDATES = "aws.dynamodb.global_secondary_index_updates";
    TMP_MESSAGING_SYSTEM = "messaging.system";
    TMP_MESSAGING_DESTINATION = "messaging.destination";
    TMP_MESSAGING_DESTINATION_KIND = "messaging.destination_kind";
    TMP_MESSAGING_TEMP_DESTINATION = "messaging.temp_destination";
    TMP_MESSAGING_PROTOCOL = "messaging.protocol";
    TMP_MESSAGING_PROTOCOL_VERSION = "messaging.protocol_version";
    TMP_MESSAGING_URL = "messaging.url";
    TMP_MESSAGING_MESSAGE_ID = "messaging.message_id";
    TMP_MESSAGING_CONVERSATION_ID = "messaging.conversation_id";
    TMP_MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES = "messaging.message_payload_size_bytes";
    TMP_MESSAGING_MESSAGE_PAYLOAD_COMPRESSED_SIZE_BYTES = "messaging.message_payload_compressed_size_bytes";
    TMP_MESSAGING_OPERATION = "messaging.operation";
    TMP_MESSAGING_CONSUMER_ID = "messaging.consumer_id";
    TMP_MESSAGING_RABBITMQ_ROUTING_KEY = "messaging.rabbitmq.routing_key";
    TMP_MESSAGING_KAFKA_MESSAGE_KEY = "messaging.kafka.message_key";
    TMP_MESSAGING_KAFKA_CONSUMER_GROUP = "messaging.kafka.consumer_group";
    TMP_MESSAGING_KAFKA_CLIENT_ID = "messaging.kafka.client_id";
    TMP_MESSAGING_KAFKA_PARTITION = "messaging.kafka.partition";
    TMP_MESSAGING_KAFKA_TOMBSTONE = "messaging.kafka.tombstone";
    TMP_RPC_SYSTEM = "rpc.system";
    TMP_RPC_SERVICE = "rpc.service";
    TMP_RPC_METHOD = "rpc.method";
    TMP_RPC_GRPC_STATUS_CODE = "rpc.grpc.status_code";
    TMP_RPC_JSONRPC_VERSION = "rpc.jsonrpc.version";
    TMP_RPC_JSONRPC_REQUEST_ID = "rpc.jsonrpc.request_id";
    TMP_RPC_JSONRPC_ERROR_CODE = "rpc.jsonrpc.error_code";
    TMP_RPC_JSONRPC_ERROR_MESSAGE = "rpc.jsonrpc.error_message";
    TMP_MESSAGE_TYPE = "message.type";
    TMP_MESSAGE_ID = "message.id";
    TMP_MESSAGE_COMPRESSED_SIZE = "message.compressed_size";
    TMP_MESSAGE_UNCOMPRESSED_SIZE = "message.uncompressed_size";
    SEMATTRS_AWS_LAMBDA_INVOKED_ARN = TMP_AWS_LAMBDA_INVOKED_ARN;
    SEMATTRS_DB_SYSTEM = TMP_DB_SYSTEM;
    SEMATTRS_DB_CONNECTION_STRING = TMP_DB_CONNECTION_STRING;
    SEMATTRS_DB_USER = TMP_DB_USER;
    SEMATTRS_DB_JDBC_DRIVER_CLASSNAME = TMP_DB_JDBC_DRIVER_CLASSNAME;
    SEMATTRS_DB_NAME = TMP_DB_NAME;
    SEMATTRS_DB_STATEMENT = TMP_DB_STATEMENT;
    SEMATTRS_DB_OPERATION = TMP_DB_OPERATION;
    SEMATTRS_DB_MSSQL_INSTANCE_NAME = TMP_DB_MSSQL_INSTANCE_NAME;
    SEMATTRS_DB_CASSANDRA_KEYSPACE = TMP_DB_CASSANDRA_KEYSPACE;
    SEMATTRS_DB_CASSANDRA_PAGE_SIZE = TMP_DB_CASSANDRA_PAGE_SIZE;
    SEMATTRS_DB_CASSANDRA_CONSISTENCY_LEVEL = TMP_DB_CASSANDRA_CONSISTENCY_LEVEL;
    SEMATTRS_DB_CASSANDRA_TABLE = TMP_DB_CASSANDRA_TABLE;
    SEMATTRS_DB_CASSANDRA_IDEMPOTENCE = TMP_DB_CASSANDRA_IDEMPOTENCE;
    SEMATTRS_DB_CASSANDRA_SPECULATIVE_EXECUTION_COUNT = TMP_DB_CASSANDRA_SPECULATIVE_EXECUTION_COUNT;
    SEMATTRS_DB_CASSANDRA_COORDINATOR_ID = TMP_DB_CASSANDRA_COORDINATOR_ID;
    SEMATTRS_DB_CASSANDRA_COORDINATOR_DC = TMP_DB_CASSANDRA_COORDINATOR_DC;
    SEMATTRS_DB_HBASE_NAMESPACE = TMP_DB_HBASE_NAMESPACE;
    SEMATTRS_DB_REDIS_DATABASE_INDEX = TMP_DB_REDIS_DATABASE_INDEX;
    SEMATTRS_DB_MONGODB_COLLECTION = TMP_DB_MONGODB_COLLECTION;
    SEMATTRS_DB_SQL_TABLE = TMP_DB_SQL_TABLE;
    SEMATTRS_EXCEPTION_TYPE = TMP_EXCEPTION_TYPE;
    SEMATTRS_EXCEPTION_MESSAGE = TMP_EXCEPTION_MESSAGE;
    SEMATTRS_EXCEPTION_STACKTRACE = TMP_EXCEPTION_STACKTRACE;
    SEMATTRS_EXCEPTION_ESCAPED = TMP_EXCEPTION_ESCAPED;
    SEMATTRS_FAAS_TRIGGER = TMP_FAAS_TRIGGER;
    SEMATTRS_FAAS_EXECUTION = TMP_FAAS_EXECUTION;
    SEMATTRS_FAAS_DOCUMENT_COLLECTION = TMP_FAAS_DOCUMENT_COLLECTION;
    SEMATTRS_FAAS_DOCUMENT_OPERATION = TMP_FAAS_DOCUMENT_OPERATION;
    SEMATTRS_FAAS_DOCUMENT_TIME = TMP_FAAS_DOCUMENT_TIME;
    SEMATTRS_FAAS_DOCUMENT_NAME = TMP_FAAS_DOCUMENT_NAME;
    SEMATTRS_FAAS_TIME = TMP_FAAS_TIME;
    SEMATTRS_FAAS_CRON = TMP_FAAS_CRON;
    SEMATTRS_FAAS_COLDSTART = TMP_FAAS_COLDSTART;
    SEMATTRS_FAAS_INVOKED_NAME = TMP_FAAS_INVOKED_NAME;
    SEMATTRS_FAAS_INVOKED_PROVIDER = TMP_FAAS_INVOKED_PROVIDER;
    SEMATTRS_FAAS_INVOKED_REGION = TMP_FAAS_INVOKED_REGION;
    SEMATTRS_NET_TRANSPORT = TMP_NET_TRANSPORT;
    SEMATTRS_NET_PEER_IP = TMP_NET_PEER_IP;
    SEMATTRS_NET_PEER_PORT = TMP_NET_PEER_PORT;
    SEMATTRS_NET_PEER_NAME = TMP_NET_PEER_NAME;
    SEMATTRS_NET_HOST_IP = TMP_NET_HOST_IP;
    SEMATTRS_NET_HOST_PORT = TMP_NET_HOST_PORT;
    SEMATTRS_NET_HOST_NAME = TMP_NET_HOST_NAME;
    SEMATTRS_NET_HOST_CONNECTION_TYPE = TMP_NET_HOST_CONNECTION_TYPE;
    SEMATTRS_NET_HOST_CONNECTION_SUBTYPE = TMP_NET_HOST_CONNECTION_SUBTYPE;
    SEMATTRS_NET_HOST_CARRIER_NAME = TMP_NET_HOST_CARRIER_NAME;
    SEMATTRS_NET_HOST_CARRIER_MCC = TMP_NET_HOST_CARRIER_MCC;
    SEMATTRS_NET_HOST_CARRIER_MNC = TMP_NET_HOST_CARRIER_MNC;
    SEMATTRS_NET_HOST_CARRIER_ICC = TMP_NET_HOST_CARRIER_ICC;
    SEMATTRS_PEER_SERVICE = TMP_PEER_SERVICE;
    SEMATTRS_ENDUSER_ID = TMP_ENDUSER_ID;
    SEMATTRS_ENDUSER_ROLE = TMP_ENDUSER_ROLE;
    SEMATTRS_ENDUSER_SCOPE = TMP_ENDUSER_SCOPE;
    SEMATTRS_THREAD_ID = TMP_THREAD_ID;
    SEMATTRS_THREAD_NAME = TMP_THREAD_NAME;
    SEMATTRS_CODE_FUNCTION = TMP_CODE_FUNCTION;
    SEMATTRS_CODE_NAMESPACE = TMP_CODE_NAMESPACE;
    SEMATTRS_CODE_FILEPATH = TMP_CODE_FILEPATH;
    SEMATTRS_CODE_LINENO = TMP_CODE_LINENO;
    SEMATTRS_HTTP_METHOD = TMP_HTTP_METHOD;
    SEMATTRS_HTTP_URL = TMP_HTTP_URL;
    SEMATTRS_HTTP_TARGET = TMP_HTTP_TARGET;
    SEMATTRS_HTTP_HOST = TMP_HTTP_HOST;
    SEMATTRS_HTTP_SCHEME = TMP_HTTP_SCHEME;
    SEMATTRS_HTTP_STATUS_CODE = TMP_HTTP_STATUS_CODE;
    SEMATTRS_HTTP_FLAVOR = TMP_HTTP_FLAVOR;
    SEMATTRS_HTTP_USER_AGENT = TMP_HTTP_USER_AGENT;
    SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH = TMP_HTTP_REQUEST_CONTENT_LENGTH;
    SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED = TMP_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED;
    SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH = TMP_HTTP_RESPONSE_CONTENT_LENGTH;
    SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED = TMP_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED;
    SEMATTRS_HTTP_SERVER_NAME = TMP_HTTP_SERVER_NAME;
    SEMATTRS_HTTP_ROUTE = TMP_HTTP_ROUTE;
    SEMATTRS_HTTP_CLIENT_IP = TMP_HTTP_CLIENT_IP;
    SEMATTRS_AWS_DYNAMODB_TABLE_NAMES = TMP_AWS_DYNAMODB_TABLE_NAMES;
    SEMATTRS_AWS_DYNAMODB_CONSUMED_CAPACITY = TMP_AWS_DYNAMODB_CONSUMED_CAPACITY;
    SEMATTRS_AWS_DYNAMODB_ITEM_COLLECTION_METRICS = TMP_AWS_DYNAMODB_ITEM_COLLECTION_METRICS;
    SEMATTRS_AWS_DYNAMODB_PROVISIONED_READ_CAPACITY = TMP_AWS_DYNAMODB_PROVISIONED_READ_CAPACITY;
    SEMATTRS_AWS_DYNAMODB_PROVISIONED_WRITE_CAPACITY = TMP_AWS_DYNAMODB_PROVISIONED_WRITE_CAPACITY;
    SEMATTRS_AWS_DYNAMODB_CONSISTENT_READ = TMP_AWS_DYNAMODB_CONSISTENT_READ;
    SEMATTRS_AWS_DYNAMODB_PROJECTION = TMP_AWS_DYNAMODB_PROJECTION;
    SEMATTRS_AWS_DYNAMODB_LIMIT = TMP_AWS_DYNAMODB_LIMIT;
    SEMATTRS_AWS_DYNAMODB_ATTRIBUTES_TO_GET = TMP_AWS_DYNAMODB_ATTRIBUTES_TO_GET;
    SEMATTRS_AWS_DYNAMODB_INDEX_NAME = TMP_AWS_DYNAMODB_INDEX_NAME;
    SEMATTRS_AWS_DYNAMODB_SELECT = TMP_AWS_DYNAMODB_SELECT;
    SEMATTRS_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEXES = TMP_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEXES;
    SEMATTRS_AWS_DYNAMODB_LOCAL_SECONDARY_INDEXES = TMP_AWS_DYNAMODB_LOCAL_SECONDARY_INDEXES;
    SEMATTRS_AWS_DYNAMODB_EXCLUSIVE_START_TABLE = TMP_AWS_DYNAMODB_EXCLUSIVE_START_TABLE;
    SEMATTRS_AWS_DYNAMODB_TABLE_COUNT = TMP_AWS_DYNAMODB_TABLE_COUNT;
    SEMATTRS_AWS_DYNAMODB_SCAN_FORWARD = TMP_AWS_DYNAMODB_SCAN_FORWARD;
    SEMATTRS_AWS_DYNAMODB_SEGMENT = TMP_AWS_DYNAMODB_SEGMENT;
    SEMATTRS_AWS_DYNAMODB_TOTAL_SEGMENTS = TMP_AWS_DYNAMODB_TOTAL_SEGMENTS;
    SEMATTRS_AWS_DYNAMODB_COUNT = TMP_AWS_DYNAMODB_COUNT;
    SEMATTRS_AWS_DYNAMODB_SCANNED_COUNT = TMP_AWS_DYNAMODB_SCANNED_COUNT;
    SEMATTRS_AWS_DYNAMODB_ATTRIBUTE_DEFINITIONS = TMP_AWS_DYNAMODB_ATTRIBUTE_DEFINITIONS;
    SEMATTRS_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEX_UPDATES = TMP_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEX_UPDATES;
    SEMATTRS_MESSAGING_SYSTEM = TMP_MESSAGING_SYSTEM;
    SEMATTRS_MESSAGING_DESTINATION = TMP_MESSAGING_DESTINATION;
    SEMATTRS_MESSAGING_DESTINATION_KIND = TMP_MESSAGING_DESTINATION_KIND;
    SEMATTRS_MESSAGING_TEMP_DESTINATION = TMP_MESSAGING_TEMP_DESTINATION;
    SEMATTRS_MESSAGING_PROTOCOL = TMP_MESSAGING_PROTOCOL;
    SEMATTRS_MESSAGING_PROTOCOL_VERSION = TMP_MESSAGING_PROTOCOL_VERSION;
    SEMATTRS_MESSAGING_URL = TMP_MESSAGING_URL;
    SEMATTRS_MESSAGING_MESSAGE_ID = TMP_MESSAGING_MESSAGE_ID;
    SEMATTRS_MESSAGING_CONVERSATION_ID = TMP_MESSAGING_CONVERSATION_ID;
    SEMATTRS_MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES = TMP_MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES;
    SEMATTRS_MESSAGING_MESSAGE_PAYLOAD_COMPRESSED_SIZE_BYTES = TMP_MESSAGING_MESSAGE_PAYLOAD_COMPRESSED_SIZE_BYTES;
    SEMATTRS_MESSAGING_OPERATION = TMP_MESSAGING_OPERATION;
    SEMATTRS_MESSAGING_CONSUMER_ID = TMP_MESSAGING_CONSUMER_ID;
    SEMATTRS_MESSAGING_RABBITMQ_ROUTING_KEY = TMP_MESSAGING_RABBITMQ_ROUTING_KEY;
    SEMATTRS_MESSAGING_KAFKA_MESSAGE_KEY = TMP_MESSAGING_KAFKA_MESSAGE_KEY;
    SEMATTRS_MESSAGING_KAFKA_CONSUMER_GROUP = TMP_MESSAGING_KAFKA_CONSUMER_GROUP;
    SEMATTRS_MESSAGING_KAFKA_CLIENT_ID = TMP_MESSAGING_KAFKA_CLIENT_ID;
    SEMATTRS_MESSAGING_KAFKA_PARTITION = TMP_MESSAGING_KAFKA_PARTITION;
    SEMATTRS_MESSAGING_KAFKA_TOMBSTONE = TMP_MESSAGING_KAFKA_TOMBSTONE;
    SEMATTRS_RPC_SYSTEM = TMP_RPC_SYSTEM;
    SEMATTRS_RPC_SERVICE = TMP_RPC_SERVICE;
    SEMATTRS_RPC_METHOD = TMP_RPC_METHOD;
    SEMATTRS_RPC_GRPC_STATUS_CODE = TMP_RPC_GRPC_STATUS_CODE;
    SEMATTRS_RPC_JSONRPC_VERSION = TMP_RPC_JSONRPC_VERSION;
    SEMATTRS_RPC_JSONRPC_REQUEST_ID = TMP_RPC_JSONRPC_REQUEST_ID;
    SEMATTRS_RPC_JSONRPC_ERROR_CODE = TMP_RPC_JSONRPC_ERROR_CODE;
    SEMATTRS_RPC_JSONRPC_ERROR_MESSAGE = TMP_RPC_JSONRPC_ERROR_MESSAGE;
    SEMATTRS_MESSAGE_TYPE = TMP_MESSAGE_TYPE;
    SEMATTRS_MESSAGE_ID = TMP_MESSAGE_ID;
    SEMATTRS_MESSAGE_COMPRESSED_SIZE = TMP_MESSAGE_COMPRESSED_SIZE;
    SEMATTRS_MESSAGE_UNCOMPRESSED_SIZE = TMP_MESSAGE_UNCOMPRESSED_SIZE;
    SemanticAttributes = /* @__PURE__ */ createConstMap([
      TMP_AWS_LAMBDA_INVOKED_ARN,
      TMP_DB_SYSTEM,
      TMP_DB_CONNECTION_STRING,
      TMP_DB_USER,
      TMP_DB_JDBC_DRIVER_CLASSNAME,
      TMP_DB_NAME,
      TMP_DB_STATEMENT,
      TMP_DB_OPERATION,
      TMP_DB_MSSQL_INSTANCE_NAME,
      TMP_DB_CASSANDRA_KEYSPACE,
      TMP_DB_CASSANDRA_PAGE_SIZE,
      TMP_DB_CASSANDRA_CONSISTENCY_LEVEL,
      TMP_DB_CASSANDRA_TABLE,
      TMP_DB_CASSANDRA_IDEMPOTENCE,
      TMP_DB_CASSANDRA_SPECULATIVE_EXECUTION_COUNT,
      TMP_DB_CASSANDRA_COORDINATOR_ID,
      TMP_DB_CASSANDRA_COORDINATOR_DC,
      TMP_DB_HBASE_NAMESPACE,
      TMP_DB_REDIS_DATABASE_INDEX,
      TMP_DB_MONGODB_COLLECTION,
      TMP_DB_SQL_TABLE,
      TMP_EXCEPTION_TYPE,
      TMP_EXCEPTION_MESSAGE,
      TMP_EXCEPTION_STACKTRACE,
      TMP_EXCEPTION_ESCAPED,
      TMP_FAAS_TRIGGER,
      TMP_FAAS_EXECUTION,
      TMP_FAAS_DOCUMENT_COLLECTION,
      TMP_FAAS_DOCUMENT_OPERATION,
      TMP_FAAS_DOCUMENT_TIME,
      TMP_FAAS_DOCUMENT_NAME,
      TMP_FAAS_TIME,
      TMP_FAAS_CRON,
      TMP_FAAS_COLDSTART,
      TMP_FAAS_INVOKED_NAME,
      TMP_FAAS_INVOKED_PROVIDER,
      TMP_FAAS_INVOKED_REGION,
      TMP_NET_TRANSPORT,
      TMP_NET_PEER_IP,
      TMP_NET_PEER_PORT,
      TMP_NET_PEER_NAME,
      TMP_NET_HOST_IP,
      TMP_NET_HOST_PORT,
      TMP_NET_HOST_NAME,
      TMP_NET_HOST_CONNECTION_TYPE,
      TMP_NET_HOST_CONNECTION_SUBTYPE,
      TMP_NET_HOST_CARRIER_NAME,
      TMP_NET_HOST_CARRIER_MCC,
      TMP_NET_HOST_CARRIER_MNC,
      TMP_NET_HOST_CARRIER_ICC,
      TMP_PEER_SERVICE,
      TMP_ENDUSER_ID,
      TMP_ENDUSER_ROLE,
      TMP_ENDUSER_SCOPE,
      TMP_THREAD_ID,
      TMP_THREAD_NAME,
      TMP_CODE_FUNCTION,
      TMP_CODE_NAMESPACE,
      TMP_CODE_FILEPATH,
      TMP_CODE_LINENO,
      TMP_HTTP_METHOD,
      TMP_HTTP_URL,
      TMP_HTTP_TARGET,
      TMP_HTTP_HOST,
      TMP_HTTP_SCHEME,
      TMP_HTTP_STATUS_CODE,
      TMP_HTTP_FLAVOR,
      TMP_HTTP_USER_AGENT,
      TMP_HTTP_REQUEST_CONTENT_LENGTH,
      TMP_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED,
      TMP_HTTP_RESPONSE_CONTENT_LENGTH,
      TMP_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED,
      TMP_HTTP_SERVER_NAME,
      TMP_HTTP_ROUTE,
      TMP_HTTP_CLIENT_IP,
      TMP_AWS_DYNAMODB_TABLE_NAMES,
      TMP_AWS_DYNAMODB_CONSUMED_CAPACITY,
      TMP_AWS_DYNAMODB_ITEM_COLLECTION_METRICS,
      TMP_AWS_DYNAMODB_PROVISIONED_READ_CAPACITY,
      TMP_AWS_DYNAMODB_PROVISIONED_WRITE_CAPACITY,
      TMP_AWS_DYNAMODB_CONSISTENT_READ,
      TMP_AWS_DYNAMODB_PROJECTION,
      TMP_AWS_DYNAMODB_LIMIT,
      TMP_AWS_DYNAMODB_ATTRIBUTES_TO_GET,
      TMP_AWS_DYNAMODB_INDEX_NAME,
      TMP_AWS_DYNAMODB_SELECT,
      TMP_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEXES,
      TMP_AWS_DYNAMODB_LOCAL_SECONDARY_INDEXES,
      TMP_AWS_DYNAMODB_EXCLUSIVE_START_TABLE,
      TMP_AWS_DYNAMODB_TABLE_COUNT,
      TMP_AWS_DYNAMODB_SCAN_FORWARD,
      TMP_AWS_DYNAMODB_SEGMENT,
      TMP_AWS_DYNAMODB_TOTAL_SEGMENTS,
      TMP_AWS_DYNAMODB_COUNT,
      TMP_AWS_DYNAMODB_SCANNED_COUNT,
      TMP_AWS_DYNAMODB_ATTRIBUTE_DEFINITIONS,
      TMP_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEX_UPDATES,
      TMP_MESSAGING_SYSTEM,
      TMP_MESSAGING_DESTINATION,
      TMP_MESSAGING_DESTINATION_KIND,
      TMP_MESSAGING_TEMP_DESTINATION,
      TMP_MESSAGING_PROTOCOL,
      TMP_MESSAGING_PROTOCOL_VERSION,
      TMP_MESSAGING_URL,
      TMP_MESSAGING_MESSAGE_ID,
      TMP_MESSAGING_CONVERSATION_ID,
      TMP_MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES,
      TMP_MESSAGING_MESSAGE_PAYLOAD_COMPRESSED_SIZE_BYTES,
      TMP_MESSAGING_OPERATION,
      TMP_MESSAGING_CONSUMER_ID,
      TMP_MESSAGING_RABBITMQ_ROUTING_KEY,
      TMP_MESSAGING_KAFKA_MESSAGE_KEY,
      TMP_MESSAGING_KAFKA_CONSUMER_GROUP,
      TMP_MESSAGING_KAFKA_CLIENT_ID,
      TMP_MESSAGING_KAFKA_PARTITION,
      TMP_MESSAGING_KAFKA_TOMBSTONE,
      TMP_RPC_SYSTEM,
      TMP_RPC_SERVICE,
      TMP_RPC_METHOD,
      TMP_RPC_GRPC_STATUS_CODE,
      TMP_RPC_JSONRPC_VERSION,
      TMP_RPC_JSONRPC_REQUEST_ID,
      TMP_RPC_JSONRPC_ERROR_CODE,
      TMP_RPC_JSONRPC_ERROR_MESSAGE,
      TMP_MESSAGE_TYPE,
      TMP_MESSAGE_ID,
      TMP_MESSAGE_COMPRESSED_SIZE,
      TMP_MESSAGE_UNCOMPRESSED_SIZE
    ]);
    TMP_DBSYSTEMVALUES_OTHER_SQL = "other_sql";
    TMP_DBSYSTEMVALUES_MSSQL = "mssql";
    TMP_DBSYSTEMVALUES_MYSQL = "mysql";
    TMP_DBSYSTEMVALUES_ORACLE = "oracle";
    TMP_DBSYSTEMVALUES_DB2 = "db2";
    TMP_DBSYSTEMVALUES_POSTGRESQL = "postgresql";
    TMP_DBSYSTEMVALUES_REDSHIFT = "redshift";
    TMP_DBSYSTEMVALUES_HIVE = "hive";
    TMP_DBSYSTEMVALUES_CLOUDSCAPE = "cloudscape";
    TMP_DBSYSTEMVALUES_HSQLDB = "hsqldb";
    TMP_DBSYSTEMVALUES_PROGRESS = "progress";
    TMP_DBSYSTEMVALUES_MAXDB = "maxdb";
    TMP_DBSYSTEMVALUES_HANADB = "hanadb";
    TMP_DBSYSTEMVALUES_INGRES = "ingres";
    TMP_DBSYSTEMVALUES_FIRSTSQL = "firstsql";
    TMP_DBSYSTEMVALUES_EDB = "edb";
    TMP_DBSYSTEMVALUES_CACHE = "cache";
    TMP_DBSYSTEMVALUES_ADABAS = "adabas";
    TMP_DBSYSTEMVALUES_FIREBIRD = "firebird";
    TMP_DBSYSTEMVALUES_DERBY = "derby";
    TMP_DBSYSTEMVALUES_FILEMAKER = "filemaker";
    TMP_DBSYSTEMVALUES_INFORMIX = "informix";
    TMP_DBSYSTEMVALUES_INSTANTDB = "instantdb";
    TMP_DBSYSTEMVALUES_INTERBASE = "interbase";
    TMP_DBSYSTEMVALUES_MARIADB = "mariadb";
    TMP_DBSYSTEMVALUES_NETEZZA = "netezza";
    TMP_DBSYSTEMVALUES_PERVASIVE = "pervasive";
    TMP_DBSYSTEMVALUES_POINTBASE = "pointbase";
    TMP_DBSYSTEMVALUES_SQLITE = "sqlite";
    TMP_DBSYSTEMVALUES_SYBASE = "sybase";
    TMP_DBSYSTEMVALUES_TERADATA = "teradata";
    TMP_DBSYSTEMVALUES_VERTICA = "vertica";
    TMP_DBSYSTEMVALUES_H2 = "h2";
    TMP_DBSYSTEMVALUES_COLDFUSION = "coldfusion";
    TMP_DBSYSTEMVALUES_CASSANDRA = "cassandra";
    TMP_DBSYSTEMVALUES_HBASE = "hbase";
    TMP_DBSYSTEMVALUES_MONGODB = "mongodb";
    TMP_DBSYSTEMVALUES_REDIS = "redis";
    TMP_DBSYSTEMVALUES_COUCHBASE = "couchbase";
    TMP_DBSYSTEMVALUES_COUCHDB = "couchdb";
    TMP_DBSYSTEMVALUES_COSMOSDB = "cosmosdb";
    TMP_DBSYSTEMVALUES_DYNAMODB = "dynamodb";
    TMP_DBSYSTEMVALUES_NEO4J = "neo4j";
    TMP_DBSYSTEMVALUES_GEODE = "geode";
    TMP_DBSYSTEMVALUES_ELASTICSEARCH = "elasticsearch";
    TMP_DBSYSTEMVALUES_MEMCACHED = "memcached";
    TMP_DBSYSTEMVALUES_COCKROACHDB = "cockroachdb";
    DBSYSTEMVALUES_OTHER_SQL = TMP_DBSYSTEMVALUES_OTHER_SQL;
    DBSYSTEMVALUES_MSSQL = TMP_DBSYSTEMVALUES_MSSQL;
    DBSYSTEMVALUES_MYSQL = TMP_DBSYSTEMVALUES_MYSQL;
    DBSYSTEMVALUES_ORACLE = TMP_DBSYSTEMVALUES_ORACLE;
    DBSYSTEMVALUES_DB2 = TMP_DBSYSTEMVALUES_DB2;
    DBSYSTEMVALUES_POSTGRESQL = TMP_DBSYSTEMVALUES_POSTGRESQL;
    DBSYSTEMVALUES_REDSHIFT = TMP_DBSYSTEMVALUES_REDSHIFT;
    DBSYSTEMVALUES_HIVE = TMP_DBSYSTEMVALUES_HIVE;
    DBSYSTEMVALUES_CLOUDSCAPE = TMP_DBSYSTEMVALUES_CLOUDSCAPE;
    DBSYSTEMVALUES_HSQLDB = TMP_DBSYSTEMVALUES_HSQLDB;
    DBSYSTEMVALUES_PROGRESS = TMP_DBSYSTEMVALUES_PROGRESS;
    DBSYSTEMVALUES_MAXDB = TMP_DBSYSTEMVALUES_MAXDB;
    DBSYSTEMVALUES_HANADB = TMP_DBSYSTEMVALUES_HANADB;
    DBSYSTEMVALUES_INGRES = TMP_DBSYSTEMVALUES_INGRES;
    DBSYSTEMVALUES_FIRSTSQL = TMP_DBSYSTEMVALUES_FIRSTSQL;
    DBSYSTEMVALUES_EDB = TMP_DBSYSTEMVALUES_EDB;
    DBSYSTEMVALUES_CACHE = TMP_DBSYSTEMVALUES_CACHE;
    DBSYSTEMVALUES_ADABAS = TMP_DBSYSTEMVALUES_ADABAS;
    DBSYSTEMVALUES_FIREBIRD = TMP_DBSYSTEMVALUES_FIREBIRD;
    DBSYSTEMVALUES_DERBY = TMP_DBSYSTEMVALUES_DERBY;
    DBSYSTEMVALUES_FILEMAKER = TMP_DBSYSTEMVALUES_FILEMAKER;
    DBSYSTEMVALUES_INFORMIX = TMP_DBSYSTEMVALUES_INFORMIX;
    DBSYSTEMVALUES_INSTANTDB = TMP_DBSYSTEMVALUES_INSTANTDB;
    DBSYSTEMVALUES_INTERBASE = TMP_DBSYSTEMVALUES_INTERBASE;
    DBSYSTEMVALUES_MARIADB = TMP_DBSYSTEMVALUES_MARIADB;
    DBSYSTEMVALUES_NETEZZA = TMP_DBSYSTEMVALUES_NETEZZA;
    DBSYSTEMVALUES_PERVASIVE = TMP_DBSYSTEMVALUES_PERVASIVE;
    DBSYSTEMVALUES_POINTBASE = TMP_DBSYSTEMVALUES_POINTBASE;
    DBSYSTEMVALUES_SQLITE = TMP_DBSYSTEMVALUES_SQLITE;
    DBSYSTEMVALUES_SYBASE = TMP_DBSYSTEMVALUES_SYBASE;
    DBSYSTEMVALUES_TERADATA = TMP_DBSYSTEMVALUES_TERADATA;
    DBSYSTEMVALUES_VERTICA = TMP_DBSYSTEMVALUES_VERTICA;
    DBSYSTEMVALUES_H2 = TMP_DBSYSTEMVALUES_H2;
    DBSYSTEMVALUES_COLDFUSION = TMP_DBSYSTEMVALUES_COLDFUSION;
    DBSYSTEMVALUES_CASSANDRA = TMP_DBSYSTEMVALUES_CASSANDRA;
    DBSYSTEMVALUES_HBASE = TMP_DBSYSTEMVALUES_HBASE;
    DBSYSTEMVALUES_MONGODB = TMP_DBSYSTEMVALUES_MONGODB;
    DBSYSTEMVALUES_REDIS = TMP_DBSYSTEMVALUES_REDIS;
    DBSYSTEMVALUES_COUCHBASE = TMP_DBSYSTEMVALUES_COUCHBASE;
    DBSYSTEMVALUES_COUCHDB = TMP_DBSYSTEMVALUES_COUCHDB;
    DBSYSTEMVALUES_COSMOSDB = TMP_DBSYSTEMVALUES_COSMOSDB;
    DBSYSTEMVALUES_DYNAMODB = TMP_DBSYSTEMVALUES_DYNAMODB;
    DBSYSTEMVALUES_NEO4J = TMP_DBSYSTEMVALUES_NEO4J;
    DBSYSTEMVALUES_GEODE = TMP_DBSYSTEMVALUES_GEODE;
    DBSYSTEMVALUES_ELASTICSEARCH = TMP_DBSYSTEMVALUES_ELASTICSEARCH;
    DBSYSTEMVALUES_MEMCACHED = TMP_DBSYSTEMVALUES_MEMCACHED;
    DBSYSTEMVALUES_COCKROACHDB = TMP_DBSYSTEMVALUES_COCKROACHDB;
    DbSystemValues = /* @__PURE__ */ createConstMap([
      TMP_DBSYSTEMVALUES_OTHER_SQL,
      TMP_DBSYSTEMVALUES_MSSQL,
      TMP_DBSYSTEMVALUES_MYSQL,
      TMP_DBSYSTEMVALUES_ORACLE,
      TMP_DBSYSTEMVALUES_DB2,
      TMP_DBSYSTEMVALUES_POSTGRESQL,
      TMP_DBSYSTEMVALUES_REDSHIFT,
      TMP_DBSYSTEMVALUES_HIVE,
      TMP_DBSYSTEMVALUES_CLOUDSCAPE,
      TMP_DBSYSTEMVALUES_HSQLDB,
      TMP_DBSYSTEMVALUES_PROGRESS,
      TMP_DBSYSTEMVALUES_MAXDB,
      TMP_DBSYSTEMVALUES_HANADB,
      TMP_DBSYSTEMVALUES_INGRES,
      TMP_DBSYSTEMVALUES_FIRSTSQL,
      TMP_DBSYSTEMVALUES_EDB,
      TMP_DBSYSTEMVALUES_CACHE,
      TMP_DBSYSTEMVALUES_ADABAS,
      TMP_DBSYSTEMVALUES_FIREBIRD,
      TMP_DBSYSTEMVALUES_DERBY,
      TMP_DBSYSTEMVALUES_FILEMAKER,
      TMP_DBSYSTEMVALUES_INFORMIX,
      TMP_DBSYSTEMVALUES_INSTANTDB,
      TMP_DBSYSTEMVALUES_INTERBASE,
      TMP_DBSYSTEMVALUES_MARIADB,
      TMP_DBSYSTEMVALUES_NETEZZA,
      TMP_DBSYSTEMVALUES_PERVASIVE,
      TMP_DBSYSTEMVALUES_POINTBASE,
      TMP_DBSYSTEMVALUES_SQLITE,
      TMP_DBSYSTEMVALUES_SYBASE,
      TMP_DBSYSTEMVALUES_TERADATA,
      TMP_DBSYSTEMVALUES_VERTICA,
      TMP_DBSYSTEMVALUES_H2,
      TMP_DBSYSTEMVALUES_COLDFUSION,
      TMP_DBSYSTEMVALUES_CASSANDRA,
      TMP_DBSYSTEMVALUES_HBASE,
      TMP_DBSYSTEMVALUES_MONGODB,
      TMP_DBSYSTEMVALUES_REDIS,
      TMP_DBSYSTEMVALUES_COUCHBASE,
      TMP_DBSYSTEMVALUES_COUCHDB,
      TMP_DBSYSTEMVALUES_COSMOSDB,
      TMP_DBSYSTEMVALUES_DYNAMODB,
      TMP_DBSYSTEMVALUES_NEO4J,
      TMP_DBSYSTEMVALUES_GEODE,
      TMP_DBSYSTEMVALUES_ELASTICSEARCH,
      TMP_DBSYSTEMVALUES_MEMCACHED,
      TMP_DBSYSTEMVALUES_COCKROACHDB
    ]);
    TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ALL = "all";
    TMP_DBCASSANDRACONSISTENCYLEVELVALUES_EACH_QUORUM = "each_quorum";
    TMP_DBCASSANDRACONSISTENCYLEVELVALUES_QUORUM = "quorum";
    TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_QUORUM = "local_quorum";
    TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ONE = "one";
    TMP_DBCASSANDRACONSISTENCYLEVELVALUES_TWO = "two";
    TMP_DBCASSANDRACONSISTENCYLEVELVALUES_THREE = "three";
    TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_ONE = "local_one";
    TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ANY = "any";
    TMP_DBCASSANDRACONSISTENCYLEVELVALUES_SERIAL = "serial";
    TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_SERIAL = "local_serial";
    DBCASSANDRACONSISTENCYLEVELVALUES_ALL = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ALL;
    DBCASSANDRACONSISTENCYLEVELVALUES_EACH_QUORUM = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_EACH_QUORUM;
    DBCASSANDRACONSISTENCYLEVELVALUES_QUORUM = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_QUORUM;
    DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_QUORUM = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_QUORUM;
    DBCASSANDRACONSISTENCYLEVELVALUES_ONE = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ONE;
    DBCASSANDRACONSISTENCYLEVELVALUES_TWO = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_TWO;
    DBCASSANDRACONSISTENCYLEVELVALUES_THREE = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_THREE;
    DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_ONE = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_ONE;
    DBCASSANDRACONSISTENCYLEVELVALUES_ANY = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ANY;
    DBCASSANDRACONSISTENCYLEVELVALUES_SERIAL = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_SERIAL;
    DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_SERIAL = TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_SERIAL;
    DbCassandraConsistencyLevelValues = /* @__PURE__ */ createConstMap([
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ALL,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_EACH_QUORUM,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_QUORUM,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_QUORUM,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ONE,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_TWO,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_THREE,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_ONE,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_ANY,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_SERIAL,
      TMP_DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_SERIAL
    ]);
    TMP_FAASTRIGGERVALUES_DATASOURCE = "datasource";
    TMP_FAASTRIGGERVALUES_HTTP = "http";
    TMP_FAASTRIGGERVALUES_PUBSUB = "pubsub";
    TMP_FAASTRIGGERVALUES_TIMER = "timer";
    TMP_FAASTRIGGERVALUES_OTHER = "other";
    FAASTRIGGERVALUES_DATASOURCE = TMP_FAASTRIGGERVALUES_DATASOURCE;
    FAASTRIGGERVALUES_HTTP = TMP_FAASTRIGGERVALUES_HTTP;
    FAASTRIGGERVALUES_PUBSUB = TMP_FAASTRIGGERVALUES_PUBSUB;
    FAASTRIGGERVALUES_TIMER = TMP_FAASTRIGGERVALUES_TIMER;
    FAASTRIGGERVALUES_OTHER = TMP_FAASTRIGGERVALUES_OTHER;
    FaasTriggerValues = /* @__PURE__ */ createConstMap([
      TMP_FAASTRIGGERVALUES_DATASOURCE,
      TMP_FAASTRIGGERVALUES_HTTP,
      TMP_FAASTRIGGERVALUES_PUBSUB,
      TMP_FAASTRIGGERVALUES_TIMER,
      TMP_FAASTRIGGERVALUES_OTHER
    ]);
    TMP_FAASDOCUMENTOPERATIONVALUES_INSERT = "insert";
    TMP_FAASDOCUMENTOPERATIONVALUES_EDIT = "edit";
    TMP_FAASDOCUMENTOPERATIONVALUES_DELETE = "delete";
    FAASDOCUMENTOPERATIONVALUES_INSERT = TMP_FAASDOCUMENTOPERATIONVALUES_INSERT;
    FAASDOCUMENTOPERATIONVALUES_EDIT = TMP_FAASDOCUMENTOPERATIONVALUES_EDIT;
    FAASDOCUMENTOPERATIONVALUES_DELETE = TMP_FAASDOCUMENTOPERATIONVALUES_DELETE;
    FaasDocumentOperationValues = /* @__PURE__ */ createConstMap([
      TMP_FAASDOCUMENTOPERATIONVALUES_INSERT,
      TMP_FAASDOCUMENTOPERATIONVALUES_EDIT,
      TMP_FAASDOCUMENTOPERATIONVALUES_DELETE
    ]);
    TMP_FAASINVOKEDPROVIDERVALUES_ALIBABA_CLOUD = "alibaba_cloud";
    TMP_FAASINVOKEDPROVIDERVALUES_AWS = "aws";
    TMP_FAASINVOKEDPROVIDERVALUES_AZURE = "azure";
    TMP_FAASINVOKEDPROVIDERVALUES_GCP = "gcp";
    FAASINVOKEDPROVIDERVALUES_ALIBABA_CLOUD = TMP_FAASINVOKEDPROVIDERVALUES_ALIBABA_CLOUD;
    FAASINVOKEDPROVIDERVALUES_AWS = TMP_FAASINVOKEDPROVIDERVALUES_AWS;
    FAASINVOKEDPROVIDERVALUES_AZURE = TMP_FAASINVOKEDPROVIDERVALUES_AZURE;
    FAASINVOKEDPROVIDERVALUES_GCP = TMP_FAASINVOKEDPROVIDERVALUES_GCP;
    FaasInvokedProviderValues = /* @__PURE__ */ createConstMap([
      TMP_FAASINVOKEDPROVIDERVALUES_ALIBABA_CLOUD,
      TMP_FAASINVOKEDPROVIDERVALUES_AWS,
      TMP_FAASINVOKEDPROVIDERVALUES_AZURE,
      TMP_FAASINVOKEDPROVIDERVALUES_GCP
    ]);
    TMP_NETTRANSPORTVALUES_IP_TCP = "ip_tcp";
    TMP_NETTRANSPORTVALUES_IP_UDP = "ip_udp";
    TMP_NETTRANSPORTVALUES_IP = "ip";
    TMP_NETTRANSPORTVALUES_UNIX = "unix";
    TMP_NETTRANSPORTVALUES_PIPE = "pipe";
    TMP_NETTRANSPORTVALUES_INPROC = "inproc";
    TMP_NETTRANSPORTVALUES_OTHER = "other";
    NETTRANSPORTVALUES_IP_TCP = TMP_NETTRANSPORTVALUES_IP_TCP;
    NETTRANSPORTVALUES_IP_UDP = TMP_NETTRANSPORTVALUES_IP_UDP;
    NETTRANSPORTVALUES_IP = TMP_NETTRANSPORTVALUES_IP;
    NETTRANSPORTVALUES_UNIX = TMP_NETTRANSPORTVALUES_UNIX;
    NETTRANSPORTVALUES_PIPE = TMP_NETTRANSPORTVALUES_PIPE;
    NETTRANSPORTVALUES_INPROC = TMP_NETTRANSPORTVALUES_INPROC;
    NETTRANSPORTVALUES_OTHER = TMP_NETTRANSPORTVALUES_OTHER;
    NetTransportValues = /* @__PURE__ */ createConstMap([
      TMP_NETTRANSPORTVALUES_IP_TCP,
      TMP_NETTRANSPORTVALUES_IP_UDP,
      TMP_NETTRANSPORTVALUES_IP,
      TMP_NETTRANSPORTVALUES_UNIX,
      TMP_NETTRANSPORTVALUES_PIPE,
      TMP_NETTRANSPORTVALUES_INPROC,
      TMP_NETTRANSPORTVALUES_OTHER
    ]);
    TMP_NETHOSTCONNECTIONTYPEVALUES_WIFI = "wifi";
    TMP_NETHOSTCONNECTIONTYPEVALUES_WIRED = "wired";
    TMP_NETHOSTCONNECTIONTYPEVALUES_CELL = "cell";
    TMP_NETHOSTCONNECTIONTYPEVALUES_UNAVAILABLE = "unavailable";
    TMP_NETHOSTCONNECTIONTYPEVALUES_UNKNOWN = "unknown";
    NETHOSTCONNECTIONTYPEVALUES_WIFI = TMP_NETHOSTCONNECTIONTYPEVALUES_WIFI;
    NETHOSTCONNECTIONTYPEVALUES_WIRED = TMP_NETHOSTCONNECTIONTYPEVALUES_WIRED;
    NETHOSTCONNECTIONTYPEVALUES_CELL = TMP_NETHOSTCONNECTIONTYPEVALUES_CELL;
    NETHOSTCONNECTIONTYPEVALUES_UNAVAILABLE = TMP_NETHOSTCONNECTIONTYPEVALUES_UNAVAILABLE;
    NETHOSTCONNECTIONTYPEVALUES_UNKNOWN = TMP_NETHOSTCONNECTIONTYPEVALUES_UNKNOWN;
    NetHostConnectionTypeValues = /* @__PURE__ */ createConstMap([
      TMP_NETHOSTCONNECTIONTYPEVALUES_WIFI,
      TMP_NETHOSTCONNECTIONTYPEVALUES_WIRED,
      TMP_NETHOSTCONNECTIONTYPEVALUES_CELL,
      TMP_NETHOSTCONNECTIONTYPEVALUES_UNAVAILABLE,
      TMP_NETHOSTCONNECTIONTYPEVALUES_UNKNOWN
    ]);
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_GPRS = "gprs";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EDGE = "edge";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_UMTS = "umts";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_CDMA = "cdma";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_0 = "evdo_0";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_A = "evdo_a";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_CDMA2000_1XRTT = "cdma2000_1xrtt";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSDPA = "hsdpa";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSUPA = "hsupa";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSPA = "hspa";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_IDEN = "iden";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_B = "evdo_b";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_LTE = "lte";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EHRPD = "ehrpd";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSPAP = "hspap";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_GSM = "gsm";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_TD_SCDMA = "td_scdma";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_IWLAN = "iwlan";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_NR = "nr";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_NRNSA = "nrnsa";
    TMP_NETHOSTCONNECTIONSUBTYPEVALUES_LTE_CA = "lte_ca";
    NETHOSTCONNECTIONSUBTYPEVALUES_GPRS = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_GPRS;
    NETHOSTCONNECTIONSUBTYPEVALUES_EDGE = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EDGE;
    NETHOSTCONNECTIONSUBTYPEVALUES_UMTS = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_UMTS;
    NETHOSTCONNECTIONSUBTYPEVALUES_CDMA = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_CDMA;
    NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_0 = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_0;
    NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_A = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_A;
    NETHOSTCONNECTIONSUBTYPEVALUES_CDMA2000_1XRTT = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_CDMA2000_1XRTT;
    NETHOSTCONNECTIONSUBTYPEVALUES_HSDPA = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSDPA;
    NETHOSTCONNECTIONSUBTYPEVALUES_HSUPA = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSUPA;
    NETHOSTCONNECTIONSUBTYPEVALUES_HSPA = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSPA;
    NETHOSTCONNECTIONSUBTYPEVALUES_IDEN = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_IDEN;
    NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_B = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_B;
    NETHOSTCONNECTIONSUBTYPEVALUES_LTE = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_LTE;
    NETHOSTCONNECTIONSUBTYPEVALUES_EHRPD = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EHRPD;
    NETHOSTCONNECTIONSUBTYPEVALUES_HSPAP = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSPAP;
    NETHOSTCONNECTIONSUBTYPEVALUES_GSM = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_GSM;
    NETHOSTCONNECTIONSUBTYPEVALUES_TD_SCDMA = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_TD_SCDMA;
    NETHOSTCONNECTIONSUBTYPEVALUES_IWLAN = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_IWLAN;
    NETHOSTCONNECTIONSUBTYPEVALUES_NR = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_NR;
    NETHOSTCONNECTIONSUBTYPEVALUES_NRNSA = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_NRNSA;
    NETHOSTCONNECTIONSUBTYPEVALUES_LTE_CA = TMP_NETHOSTCONNECTIONSUBTYPEVALUES_LTE_CA;
    NetHostConnectionSubtypeValues = /* @__PURE__ */ createConstMap([
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_GPRS,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EDGE,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_UMTS,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_CDMA,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_0,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_A,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_CDMA2000_1XRTT,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSDPA,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSUPA,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSPA,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_IDEN,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_B,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_LTE,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_EHRPD,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_HSPAP,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_GSM,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_TD_SCDMA,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_IWLAN,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_NR,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_NRNSA,
      TMP_NETHOSTCONNECTIONSUBTYPEVALUES_LTE_CA
    ]);
    TMP_HTTPFLAVORVALUES_HTTP_1_0 = "1.0";
    TMP_HTTPFLAVORVALUES_HTTP_1_1 = "1.1";
    TMP_HTTPFLAVORVALUES_HTTP_2_0 = "2.0";
    TMP_HTTPFLAVORVALUES_SPDY = "SPDY";
    TMP_HTTPFLAVORVALUES_QUIC = "QUIC";
    HTTPFLAVORVALUES_HTTP_1_0 = TMP_HTTPFLAVORVALUES_HTTP_1_0;
    HTTPFLAVORVALUES_HTTP_1_1 = TMP_HTTPFLAVORVALUES_HTTP_1_1;
    HTTPFLAVORVALUES_HTTP_2_0 = TMP_HTTPFLAVORVALUES_HTTP_2_0;
    HTTPFLAVORVALUES_SPDY = TMP_HTTPFLAVORVALUES_SPDY;
    HTTPFLAVORVALUES_QUIC = TMP_HTTPFLAVORVALUES_QUIC;
    HttpFlavorValues = {
      HTTP_1_0: TMP_HTTPFLAVORVALUES_HTTP_1_0,
      HTTP_1_1: TMP_HTTPFLAVORVALUES_HTTP_1_1,
      HTTP_2_0: TMP_HTTPFLAVORVALUES_HTTP_2_0,
      SPDY: TMP_HTTPFLAVORVALUES_SPDY,
      QUIC: TMP_HTTPFLAVORVALUES_QUIC
    };
    TMP_MESSAGINGDESTINATIONKINDVALUES_QUEUE = "queue";
    TMP_MESSAGINGDESTINATIONKINDVALUES_TOPIC = "topic";
    MESSAGINGDESTINATIONKINDVALUES_QUEUE = TMP_MESSAGINGDESTINATIONKINDVALUES_QUEUE;
    MESSAGINGDESTINATIONKINDVALUES_TOPIC = TMP_MESSAGINGDESTINATIONKINDVALUES_TOPIC;
    MessagingDestinationKindValues = /* @__PURE__ */ createConstMap([
      TMP_MESSAGINGDESTINATIONKINDVALUES_QUEUE,
      TMP_MESSAGINGDESTINATIONKINDVALUES_TOPIC
    ]);
    TMP_MESSAGINGOPERATIONVALUES_RECEIVE = "receive";
    TMP_MESSAGINGOPERATIONVALUES_PROCESS = "process";
    MESSAGINGOPERATIONVALUES_RECEIVE = TMP_MESSAGINGOPERATIONVALUES_RECEIVE;
    MESSAGINGOPERATIONVALUES_PROCESS = TMP_MESSAGINGOPERATIONVALUES_PROCESS;
    MessagingOperationValues = /* @__PURE__ */ createConstMap([
      TMP_MESSAGINGOPERATIONVALUES_RECEIVE,
      TMP_MESSAGINGOPERATIONVALUES_PROCESS
    ]);
    TMP_RPCGRPCSTATUSCODEVALUES_OK = 0;
    TMP_RPCGRPCSTATUSCODEVALUES_CANCELLED = 1;
    TMP_RPCGRPCSTATUSCODEVALUES_UNKNOWN = 2;
    TMP_RPCGRPCSTATUSCODEVALUES_INVALID_ARGUMENT = 3;
    TMP_RPCGRPCSTATUSCODEVALUES_DEADLINE_EXCEEDED = 4;
    TMP_RPCGRPCSTATUSCODEVALUES_NOT_FOUND = 5;
    TMP_RPCGRPCSTATUSCODEVALUES_ALREADY_EXISTS = 6;
    TMP_RPCGRPCSTATUSCODEVALUES_PERMISSION_DENIED = 7;
    TMP_RPCGRPCSTATUSCODEVALUES_RESOURCE_EXHAUSTED = 8;
    TMP_RPCGRPCSTATUSCODEVALUES_FAILED_PRECONDITION = 9;
    TMP_RPCGRPCSTATUSCODEVALUES_ABORTED = 10;
    TMP_RPCGRPCSTATUSCODEVALUES_OUT_OF_RANGE = 11;
    TMP_RPCGRPCSTATUSCODEVALUES_UNIMPLEMENTED = 12;
    TMP_RPCGRPCSTATUSCODEVALUES_INTERNAL = 13;
    TMP_RPCGRPCSTATUSCODEVALUES_UNAVAILABLE = 14;
    TMP_RPCGRPCSTATUSCODEVALUES_DATA_LOSS = 15;
    TMP_RPCGRPCSTATUSCODEVALUES_UNAUTHENTICATED = 16;
    RPCGRPCSTATUSCODEVALUES_OK = TMP_RPCGRPCSTATUSCODEVALUES_OK;
    RPCGRPCSTATUSCODEVALUES_CANCELLED = TMP_RPCGRPCSTATUSCODEVALUES_CANCELLED;
    RPCGRPCSTATUSCODEVALUES_UNKNOWN = TMP_RPCGRPCSTATUSCODEVALUES_UNKNOWN;
    RPCGRPCSTATUSCODEVALUES_INVALID_ARGUMENT = TMP_RPCGRPCSTATUSCODEVALUES_INVALID_ARGUMENT;
    RPCGRPCSTATUSCODEVALUES_DEADLINE_EXCEEDED = TMP_RPCGRPCSTATUSCODEVALUES_DEADLINE_EXCEEDED;
    RPCGRPCSTATUSCODEVALUES_NOT_FOUND = TMP_RPCGRPCSTATUSCODEVALUES_NOT_FOUND;
    RPCGRPCSTATUSCODEVALUES_ALREADY_EXISTS = TMP_RPCGRPCSTATUSCODEVALUES_ALREADY_EXISTS;
    RPCGRPCSTATUSCODEVALUES_PERMISSION_DENIED = TMP_RPCGRPCSTATUSCODEVALUES_PERMISSION_DENIED;
    RPCGRPCSTATUSCODEVALUES_RESOURCE_EXHAUSTED = TMP_RPCGRPCSTATUSCODEVALUES_RESOURCE_EXHAUSTED;
    RPCGRPCSTATUSCODEVALUES_FAILED_PRECONDITION = TMP_RPCGRPCSTATUSCODEVALUES_FAILED_PRECONDITION;
    RPCGRPCSTATUSCODEVALUES_ABORTED = TMP_RPCGRPCSTATUSCODEVALUES_ABORTED;
    RPCGRPCSTATUSCODEVALUES_OUT_OF_RANGE = TMP_RPCGRPCSTATUSCODEVALUES_OUT_OF_RANGE;
    RPCGRPCSTATUSCODEVALUES_UNIMPLEMENTED = TMP_RPCGRPCSTATUSCODEVALUES_UNIMPLEMENTED;
    RPCGRPCSTATUSCODEVALUES_INTERNAL = TMP_RPCGRPCSTATUSCODEVALUES_INTERNAL;
    RPCGRPCSTATUSCODEVALUES_UNAVAILABLE = TMP_RPCGRPCSTATUSCODEVALUES_UNAVAILABLE;
    RPCGRPCSTATUSCODEVALUES_DATA_LOSS = TMP_RPCGRPCSTATUSCODEVALUES_DATA_LOSS;
    RPCGRPCSTATUSCODEVALUES_UNAUTHENTICATED = TMP_RPCGRPCSTATUSCODEVALUES_UNAUTHENTICATED;
    RpcGrpcStatusCodeValues = {
      OK: TMP_RPCGRPCSTATUSCODEVALUES_OK,
      CANCELLED: TMP_RPCGRPCSTATUSCODEVALUES_CANCELLED,
      UNKNOWN: TMP_RPCGRPCSTATUSCODEVALUES_UNKNOWN,
      INVALID_ARGUMENT: TMP_RPCGRPCSTATUSCODEVALUES_INVALID_ARGUMENT,
      DEADLINE_EXCEEDED: TMP_RPCGRPCSTATUSCODEVALUES_DEADLINE_EXCEEDED,
      NOT_FOUND: TMP_RPCGRPCSTATUSCODEVALUES_NOT_FOUND,
      ALREADY_EXISTS: TMP_RPCGRPCSTATUSCODEVALUES_ALREADY_EXISTS,
      PERMISSION_DENIED: TMP_RPCGRPCSTATUSCODEVALUES_PERMISSION_DENIED,
      RESOURCE_EXHAUSTED: TMP_RPCGRPCSTATUSCODEVALUES_RESOURCE_EXHAUSTED,
      FAILED_PRECONDITION: TMP_RPCGRPCSTATUSCODEVALUES_FAILED_PRECONDITION,
      ABORTED: TMP_RPCGRPCSTATUSCODEVALUES_ABORTED,
      OUT_OF_RANGE: TMP_RPCGRPCSTATUSCODEVALUES_OUT_OF_RANGE,
      UNIMPLEMENTED: TMP_RPCGRPCSTATUSCODEVALUES_UNIMPLEMENTED,
      INTERNAL: TMP_RPCGRPCSTATUSCODEVALUES_INTERNAL,
      UNAVAILABLE: TMP_RPCGRPCSTATUSCODEVALUES_UNAVAILABLE,
      DATA_LOSS: TMP_RPCGRPCSTATUSCODEVALUES_DATA_LOSS,
      UNAUTHENTICATED: TMP_RPCGRPCSTATUSCODEVALUES_UNAUTHENTICATED
    };
    TMP_MESSAGETYPEVALUES_SENT = "SENT";
    TMP_MESSAGETYPEVALUES_RECEIVED = "RECEIVED";
    MESSAGETYPEVALUES_SENT = TMP_MESSAGETYPEVALUES_SENT;
    MESSAGETYPEVALUES_RECEIVED = TMP_MESSAGETYPEVALUES_RECEIVED;
    MessageTypeValues = /* @__PURE__ */ createConstMap([
      TMP_MESSAGETYPEVALUES_SENT,
      TMP_MESSAGETYPEVALUES_RECEIVED
    ]);
  }
});

// node_modules/@opentelemetry/semantic-conventions/build/esm/trace/index.js
var init_trace2 = __esm({
  "node_modules/@opentelemetry/semantic-conventions/build/esm/trace/index.js"() {
    init_SemanticAttributes();
  }
});

// node_modules/@opentelemetry/semantic-conventions/build/esm/resource/SemanticResourceAttributes.js
var TMP_CLOUD_PROVIDER, TMP_CLOUD_ACCOUNT_ID, TMP_CLOUD_REGION, TMP_CLOUD_AVAILABILITY_ZONE, TMP_CLOUD_PLATFORM, TMP_AWS_ECS_CONTAINER_ARN, TMP_AWS_ECS_CLUSTER_ARN, TMP_AWS_ECS_LAUNCHTYPE, TMP_AWS_ECS_TASK_ARN, TMP_AWS_ECS_TASK_FAMILY, TMP_AWS_ECS_TASK_REVISION, TMP_AWS_EKS_CLUSTER_ARN, TMP_AWS_LOG_GROUP_NAMES, TMP_AWS_LOG_GROUP_ARNS, TMP_AWS_LOG_STREAM_NAMES, TMP_AWS_LOG_STREAM_ARNS, TMP_CONTAINER_NAME, TMP_CONTAINER_ID, TMP_CONTAINER_RUNTIME, TMP_CONTAINER_IMAGE_NAME, TMP_CONTAINER_IMAGE_TAG, TMP_DEPLOYMENT_ENVIRONMENT, TMP_DEVICE_ID, TMP_DEVICE_MODEL_IDENTIFIER, TMP_DEVICE_MODEL_NAME, TMP_FAAS_NAME, TMP_FAAS_ID, TMP_FAAS_VERSION, TMP_FAAS_INSTANCE, TMP_FAAS_MAX_MEMORY, TMP_HOST_ID, TMP_HOST_NAME, TMP_HOST_TYPE, TMP_HOST_ARCH, TMP_HOST_IMAGE_NAME, TMP_HOST_IMAGE_ID, TMP_HOST_IMAGE_VERSION, TMP_K8S_CLUSTER_NAME, TMP_K8S_NODE_NAME, TMP_K8S_NODE_UID, TMP_K8S_NAMESPACE_NAME, TMP_K8S_POD_UID, TMP_K8S_POD_NAME, TMP_K8S_CONTAINER_NAME, TMP_K8S_REPLICASET_UID, TMP_K8S_REPLICASET_NAME, TMP_K8S_DEPLOYMENT_UID, TMP_K8S_DEPLOYMENT_NAME, TMP_K8S_STATEFULSET_UID, TMP_K8S_STATEFULSET_NAME, TMP_K8S_DAEMONSET_UID, TMP_K8S_DAEMONSET_NAME, TMP_K8S_JOB_UID, TMP_K8S_JOB_NAME, TMP_K8S_CRONJOB_UID, TMP_K8S_CRONJOB_NAME, TMP_OS_TYPE, TMP_OS_DESCRIPTION, TMP_OS_NAME, TMP_OS_VERSION, TMP_PROCESS_PID, TMP_PROCESS_EXECUTABLE_NAME, TMP_PROCESS_EXECUTABLE_PATH, TMP_PROCESS_COMMAND, TMP_PROCESS_COMMAND_LINE, TMP_PROCESS_COMMAND_ARGS, TMP_PROCESS_OWNER, TMP_PROCESS_RUNTIME_NAME, TMP_PROCESS_RUNTIME_VERSION, TMP_PROCESS_RUNTIME_DESCRIPTION, TMP_SERVICE_NAME, TMP_SERVICE_NAMESPACE, TMP_SERVICE_INSTANCE_ID, TMP_SERVICE_VERSION, TMP_TELEMETRY_SDK_NAME, TMP_TELEMETRY_SDK_LANGUAGE, TMP_TELEMETRY_SDK_VERSION, TMP_TELEMETRY_AUTO_VERSION, TMP_WEBENGINE_NAME, TMP_WEBENGINE_VERSION, TMP_WEBENGINE_DESCRIPTION, SEMRESATTRS_CLOUD_PROVIDER, SEMRESATTRS_CLOUD_ACCOUNT_ID, SEMRESATTRS_CLOUD_REGION, SEMRESATTRS_CLOUD_AVAILABILITY_ZONE, SEMRESATTRS_CLOUD_PLATFORM, SEMRESATTRS_AWS_ECS_CONTAINER_ARN, SEMRESATTRS_AWS_ECS_CLUSTER_ARN, SEMRESATTRS_AWS_ECS_LAUNCHTYPE, SEMRESATTRS_AWS_ECS_TASK_ARN, SEMRESATTRS_AWS_ECS_TASK_FAMILY, SEMRESATTRS_AWS_ECS_TASK_REVISION, SEMRESATTRS_AWS_EKS_CLUSTER_ARN, SEMRESATTRS_AWS_LOG_GROUP_NAMES, SEMRESATTRS_AWS_LOG_GROUP_ARNS, SEMRESATTRS_AWS_LOG_STREAM_NAMES, SEMRESATTRS_AWS_LOG_STREAM_ARNS, SEMRESATTRS_CONTAINER_NAME, SEMRESATTRS_CONTAINER_ID, SEMRESATTRS_CONTAINER_RUNTIME, SEMRESATTRS_CONTAINER_IMAGE_NAME, SEMRESATTRS_CONTAINER_IMAGE_TAG, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT, SEMRESATTRS_DEVICE_ID, SEMRESATTRS_DEVICE_MODEL_IDENTIFIER, SEMRESATTRS_DEVICE_MODEL_NAME, SEMRESATTRS_FAAS_NAME, SEMRESATTRS_FAAS_ID, SEMRESATTRS_FAAS_VERSION, SEMRESATTRS_FAAS_INSTANCE, SEMRESATTRS_FAAS_MAX_MEMORY, SEMRESATTRS_HOST_ID, SEMRESATTRS_HOST_NAME, SEMRESATTRS_HOST_TYPE, SEMRESATTRS_HOST_ARCH, SEMRESATTRS_HOST_IMAGE_NAME, SEMRESATTRS_HOST_IMAGE_ID, SEMRESATTRS_HOST_IMAGE_VERSION, SEMRESATTRS_K8S_CLUSTER_NAME, SEMRESATTRS_K8S_NODE_NAME, SEMRESATTRS_K8S_NODE_UID, SEMRESATTRS_K8S_NAMESPACE_NAME, SEMRESATTRS_K8S_POD_UID, SEMRESATTRS_K8S_POD_NAME, SEMRESATTRS_K8S_CONTAINER_NAME, SEMRESATTRS_K8S_REPLICASET_UID, SEMRESATTRS_K8S_REPLICASET_NAME, SEMRESATTRS_K8S_DEPLOYMENT_UID, SEMRESATTRS_K8S_DEPLOYMENT_NAME, SEMRESATTRS_K8S_STATEFULSET_UID, SEMRESATTRS_K8S_STATEFULSET_NAME, SEMRESATTRS_K8S_DAEMONSET_UID, SEMRESATTRS_K8S_DAEMONSET_NAME, SEMRESATTRS_K8S_JOB_UID, SEMRESATTRS_K8S_JOB_NAME, SEMRESATTRS_K8S_CRONJOB_UID, SEMRESATTRS_K8S_CRONJOB_NAME, SEMRESATTRS_OS_TYPE, SEMRESATTRS_OS_DESCRIPTION, SEMRESATTRS_OS_NAME, SEMRESATTRS_OS_VERSION, SEMRESATTRS_PROCESS_PID, SEMRESATTRS_PROCESS_EXECUTABLE_NAME, SEMRESATTRS_PROCESS_EXECUTABLE_PATH, SEMRESATTRS_PROCESS_COMMAND, SEMRESATTRS_PROCESS_COMMAND_LINE, SEMRESATTRS_PROCESS_COMMAND_ARGS, SEMRESATTRS_PROCESS_OWNER, SEMRESATTRS_PROCESS_RUNTIME_NAME, SEMRESATTRS_PROCESS_RUNTIME_VERSION, SEMRESATTRS_PROCESS_RUNTIME_DESCRIPTION, SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_NAMESPACE, SEMRESATTRS_SERVICE_INSTANCE_ID, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_TELEMETRY_SDK_NAME, SEMRESATTRS_TELEMETRY_SDK_LANGUAGE, SEMRESATTRS_TELEMETRY_SDK_VERSION, SEMRESATTRS_TELEMETRY_AUTO_VERSION, SEMRESATTRS_WEBENGINE_NAME, SEMRESATTRS_WEBENGINE_VERSION, SEMRESATTRS_WEBENGINE_DESCRIPTION, SemanticResourceAttributes, TMP_CLOUDPROVIDERVALUES_ALIBABA_CLOUD, TMP_CLOUDPROVIDERVALUES_AWS, TMP_CLOUDPROVIDERVALUES_AZURE, TMP_CLOUDPROVIDERVALUES_GCP, CLOUDPROVIDERVALUES_ALIBABA_CLOUD, CLOUDPROVIDERVALUES_AWS, CLOUDPROVIDERVALUES_AZURE, CLOUDPROVIDERVALUES_GCP, CloudProviderValues, TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS, TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC, TMP_CLOUDPLATFORMVALUES_AWS_EC2, TMP_CLOUDPLATFORMVALUES_AWS_ECS, TMP_CLOUDPLATFORMVALUES_AWS_EKS, TMP_CLOUDPLATFORMVALUES_AWS_LAMBDA, TMP_CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK, TMP_CLOUDPLATFORMVALUES_AZURE_VM, TMP_CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES, TMP_CLOUDPLATFORMVALUES_AZURE_AKS, TMP_CLOUDPLATFORMVALUES_AZURE_FUNCTIONS, TMP_CLOUDPLATFORMVALUES_AZURE_APP_SERVICE, TMP_CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE, TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_RUN, TMP_CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE, TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS, TMP_CLOUDPLATFORMVALUES_GCP_APP_ENGINE, CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS, CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC, CLOUDPLATFORMVALUES_AWS_EC2, CLOUDPLATFORMVALUES_AWS_ECS, CLOUDPLATFORMVALUES_AWS_EKS, CLOUDPLATFORMVALUES_AWS_LAMBDA, CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK, CLOUDPLATFORMVALUES_AZURE_VM, CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES, CLOUDPLATFORMVALUES_AZURE_AKS, CLOUDPLATFORMVALUES_AZURE_FUNCTIONS, CLOUDPLATFORMVALUES_AZURE_APP_SERVICE, CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE, CLOUDPLATFORMVALUES_GCP_CLOUD_RUN, CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE, CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS, CLOUDPLATFORMVALUES_GCP_APP_ENGINE, CloudPlatformValues, TMP_AWSECSLAUNCHTYPEVALUES_EC2, TMP_AWSECSLAUNCHTYPEVALUES_FARGATE, AWSECSLAUNCHTYPEVALUES_EC2, AWSECSLAUNCHTYPEVALUES_FARGATE, AwsEcsLaunchtypeValues, TMP_HOSTARCHVALUES_AMD64, TMP_HOSTARCHVALUES_ARM32, TMP_HOSTARCHVALUES_ARM64, TMP_HOSTARCHVALUES_IA64, TMP_HOSTARCHVALUES_PPC32, TMP_HOSTARCHVALUES_PPC64, TMP_HOSTARCHVALUES_X86, HOSTARCHVALUES_AMD64, HOSTARCHVALUES_ARM32, HOSTARCHVALUES_ARM64, HOSTARCHVALUES_IA64, HOSTARCHVALUES_PPC32, HOSTARCHVALUES_PPC64, HOSTARCHVALUES_X86, HostArchValues, TMP_OSTYPEVALUES_WINDOWS, TMP_OSTYPEVALUES_LINUX, TMP_OSTYPEVALUES_DARWIN, TMP_OSTYPEVALUES_FREEBSD, TMP_OSTYPEVALUES_NETBSD, TMP_OSTYPEVALUES_OPENBSD, TMP_OSTYPEVALUES_DRAGONFLYBSD, TMP_OSTYPEVALUES_HPUX, TMP_OSTYPEVALUES_AIX, TMP_OSTYPEVALUES_SOLARIS, TMP_OSTYPEVALUES_Z_OS, OSTYPEVALUES_WINDOWS, OSTYPEVALUES_LINUX, OSTYPEVALUES_DARWIN, OSTYPEVALUES_FREEBSD, OSTYPEVALUES_NETBSD, OSTYPEVALUES_OPENBSD, OSTYPEVALUES_DRAGONFLYBSD, OSTYPEVALUES_HPUX, OSTYPEVALUES_AIX, OSTYPEVALUES_SOLARIS, OSTYPEVALUES_Z_OS, OsTypeValues, TMP_TELEMETRYSDKLANGUAGEVALUES_CPP, TMP_TELEMETRYSDKLANGUAGEVALUES_DOTNET, TMP_TELEMETRYSDKLANGUAGEVALUES_ERLANG, TMP_TELEMETRYSDKLANGUAGEVALUES_GO, TMP_TELEMETRYSDKLANGUAGEVALUES_JAVA, TMP_TELEMETRYSDKLANGUAGEVALUES_NODEJS, TMP_TELEMETRYSDKLANGUAGEVALUES_PHP, TMP_TELEMETRYSDKLANGUAGEVALUES_PYTHON, TMP_TELEMETRYSDKLANGUAGEVALUES_RUBY, TMP_TELEMETRYSDKLANGUAGEVALUES_WEBJS, TELEMETRYSDKLANGUAGEVALUES_CPP, TELEMETRYSDKLANGUAGEVALUES_DOTNET, TELEMETRYSDKLANGUAGEVALUES_ERLANG, TELEMETRYSDKLANGUAGEVALUES_GO, TELEMETRYSDKLANGUAGEVALUES_JAVA, TELEMETRYSDKLANGUAGEVALUES_NODEJS, TELEMETRYSDKLANGUAGEVALUES_PHP, TELEMETRYSDKLANGUAGEVALUES_PYTHON, TELEMETRYSDKLANGUAGEVALUES_RUBY, TELEMETRYSDKLANGUAGEVALUES_WEBJS, TelemetrySdkLanguageValues;
var init_SemanticResourceAttributes = __esm({
  "node_modules/@opentelemetry/semantic-conventions/build/esm/resource/SemanticResourceAttributes.js"() {
    init_utils3();
    TMP_CLOUD_PROVIDER = "cloud.provider";
    TMP_CLOUD_ACCOUNT_ID = "cloud.account.id";
    TMP_CLOUD_REGION = "cloud.region";
    TMP_CLOUD_AVAILABILITY_ZONE = "cloud.availability_zone";
    TMP_CLOUD_PLATFORM = "cloud.platform";
    TMP_AWS_ECS_CONTAINER_ARN = "aws.ecs.container.arn";
    TMP_AWS_ECS_CLUSTER_ARN = "aws.ecs.cluster.arn";
    TMP_AWS_ECS_LAUNCHTYPE = "aws.ecs.launchtype";
    TMP_AWS_ECS_TASK_ARN = "aws.ecs.task.arn";
    TMP_AWS_ECS_TASK_FAMILY = "aws.ecs.task.family";
    TMP_AWS_ECS_TASK_REVISION = "aws.ecs.task.revision";
    TMP_AWS_EKS_CLUSTER_ARN = "aws.eks.cluster.arn";
    TMP_AWS_LOG_GROUP_NAMES = "aws.log.group.names";
    TMP_AWS_LOG_GROUP_ARNS = "aws.log.group.arns";
    TMP_AWS_LOG_STREAM_NAMES = "aws.log.stream.names";
    TMP_AWS_LOG_STREAM_ARNS = "aws.log.stream.arns";
    TMP_CONTAINER_NAME = "container.name";
    TMP_CONTAINER_ID = "container.id";
    TMP_CONTAINER_RUNTIME = "container.runtime";
    TMP_CONTAINER_IMAGE_NAME = "container.image.name";
    TMP_CONTAINER_IMAGE_TAG = "container.image.tag";
    TMP_DEPLOYMENT_ENVIRONMENT = "deployment.environment";
    TMP_DEVICE_ID = "device.id";
    TMP_DEVICE_MODEL_IDENTIFIER = "device.model.identifier";
    TMP_DEVICE_MODEL_NAME = "device.model.name";
    TMP_FAAS_NAME = "faas.name";
    TMP_FAAS_ID = "faas.id";
    TMP_FAAS_VERSION = "faas.version";
    TMP_FAAS_INSTANCE = "faas.instance";
    TMP_FAAS_MAX_MEMORY = "faas.max_memory";
    TMP_HOST_ID = "host.id";
    TMP_HOST_NAME = "host.name";
    TMP_HOST_TYPE = "host.type";
    TMP_HOST_ARCH = "host.arch";
    TMP_HOST_IMAGE_NAME = "host.image.name";
    TMP_HOST_IMAGE_ID = "host.image.id";
    TMP_HOST_IMAGE_VERSION = "host.image.version";
    TMP_K8S_CLUSTER_NAME = "k8s.cluster.name";
    TMP_K8S_NODE_NAME = "k8s.node.name";
    TMP_K8S_NODE_UID = "k8s.node.uid";
    TMP_K8S_NAMESPACE_NAME = "k8s.namespace.name";
    TMP_K8S_POD_UID = "k8s.pod.uid";
    TMP_K8S_POD_NAME = "k8s.pod.name";
    TMP_K8S_CONTAINER_NAME = "k8s.container.name";
    TMP_K8S_REPLICASET_UID = "k8s.replicaset.uid";
    TMP_K8S_REPLICASET_NAME = "k8s.replicaset.name";
    TMP_K8S_DEPLOYMENT_UID = "k8s.deployment.uid";
    TMP_K8S_DEPLOYMENT_NAME = "k8s.deployment.name";
    TMP_K8S_STATEFULSET_UID = "k8s.statefulset.uid";
    TMP_K8S_STATEFULSET_NAME = "k8s.statefulset.name";
    TMP_K8S_DAEMONSET_UID = "k8s.daemonset.uid";
    TMP_K8S_DAEMONSET_NAME = "k8s.daemonset.name";
    TMP_K8S_JOB_UID = "k8s.job.uid";
    TMP_K8S_JOB_NAME = "k8s.job.name";
    TMP_K8S_CRONJOB_UID = "k8s.cronjob.uid";
    TMP_K8S_CRONJOB_NAME = "k8s.cronjob.name";
    TMP_OS_TYPE = "os.type";
    TMP_OS_DESCRIPTION = "os.description";
    TMP_OS_NAME = "os.name";
    TMP_OS_VERSION = "os.version";
    TMP_PROCESS_PID = "process.pid";
    TMP_PROCESS_EXECUTABLE_NAME = "process.executable.name";
    TMP_PROCESS_EXECUTABLE_PATH = "process.executable.path";
    TMP_PROCESS_COMMAND = "process.command";
    TMP_PROCESS_COMMAND_LINE = "process.command_line";
    TMP_PROCESS_COMMAND_ARGS = "process.command_args";
    TMP_PROCESS_OWNER = "process.owner";
    TMP_PROCESS_RUNTIME_NAME = "process.runtime.name";
    TMP_PROCESS_RUNTIME_VERSION = "process.runtime.version";
    TMP_PROCESS_RUNTIME_DESCRIPTION = "process.runtime.description";
    TMP_SERVICE_NAME = "service.name";
    TMP_SERVICE_NAMESPACE = "service.namespace";
    TMP_SERVICE_INSTANCE_ID = "service.instance.id";
    TMP_SERVICE_VERSION = "service.version";
    TMP_TELEMETRY_SDK_NAME = "telemetry.sdk.name";
    TMP_TELEMETRY_SDK_LANGUAGE = "telemetry.sdk.language";
    TMP_TELEMETRY_SDK_VERSION = "telemetry.sdk.version";
    TMP_TELEMETRY_AUTO_VERSION = "telemetry.auto.version";
    TMP_WEBENGINE_NAME = "webengine.name";
    TMP_WEBENGINE_VERSION = "webengine.version";
    TMP_WEBENGINE_DESCRIPTION = "webengine.description";
    SEMRESATTRS_CLOUD_PROVIDER = TMP_CLOUD_PROVIDER;
    SEMRESATTRS_CLOUD_ACCOUNT_ID = TMP_CLOUD_ACCOUNT_ID;
    SEMRESATTRS_CLOUD_REGION = TMP_CLOUD_REGION;
    SEMRESATTRS_CLOUD_AVAILABILITY_ZONE = TMP_CLOUD_AVAILABILITY_ZONE;
    SEMRESATTRS_CLOUD_PLATFORM = TMP_CLOUD_PLATFORM;
    SEMRESATTRS_AWS_ECS_CONTAINER_ARN = TMP_AWS_ECS_CONTAINER_ARN;
    SEMRESATTRS_AWS_ECS_CLUSTER_ARN = TMP_AWS_ECS_CLUSTER_ARN;
    SEMRESATTRS_AWS_ECS_LAUNCHTYPE = TMP_AWS_ECS_LAUNCHTYPE;
    SEMRESATTRS_AWS_ECS_TASK_ARN = TMP_AWS_ECS_TASK_ARN;
    SEMRESATTRS_AWS_ECS_TASK_FAMILY = TMP_AWS_ECS_TASK_FAMILY;
    SEMRESATTRS_AWS_ECS_TASK_REVISION = TMP_AWS_ECS_TASK_REVISION;
    SEMRESATTRS_AWS_EKS_CLUSTER_ARN = TMP_AWS_EKS_CLUSTER_ARN;
    SEMRESATTRS_AWS_LOG_GROUP_NAMES = TMP_AWS_LOG_GROUP_NAMES;
    SEMRESATTRS_AWS_LOG_GROUP_ARNS = TMP_AWS_LOG_GROUP_ARNS;
    SEMRESATTRS_AWS_LOG_STREAM_NAMES = TMP_AWS_LOG_STREAM_NAMES;
    SEMRESATTRS_AWS_LOG_STREAM_ARNS = TMP_AWS_LOG_STREAM_ARNS;
    SEMRESATTRS_CONTAINER_NAME = TMP_CONTAINER_NAME;
    SEMRESATTRS_CONTAINER_ID = TMP_CONTAINER_ID;
    SEMRESATTRS_CONTAINER_RUNTIME = TMP_CONTAINER_RUNTIME;
    SEMRESATTRS_CONTAINER_IMAGE_NAME = TMP_CONTAINER_IMAGE_NAME;
    SEMRESATTRS_CONTAINER_IMAGE_TAG = TMP_CONTAINER_IMAGE_TAG;
    SEMRESATTRS_DEPLOYMENT_ENVIRONMENT = TMP_DEPLOYMENT_ENVIRONMENT;
    SEMRESATTRS_DEVICE_ID = TMP_DEVICE_ID;
    SEMRESATTRS_DEVICE_MODEL_IDENTIFIER = TMP_DEVICE_MODEL_IDENTIFIER;
    SEMRESATTRS_DEVICE_MODEL_NAME = TMP_DEVICE_MODEL_NAME;
    SEMRESATTRS_FAAS_NAME = TMP_FAAS_NAME;
    SEMRESATTRS_FAAS_ID = TMP_FAAS_ID;
    SEMRESATTRS_FAAS_VERSION = TMP_FAAS_VERSION;
    SEMRESATTRS_FAAS_INSTANCE = TMP_FAAS_INSTANCE;
    SEMRESATTRS_FAAS_MAX_MEMORY = TMP_FAAS_MAX_MEMORY;
    SEMRESATTRS_HOST_ID = TMP_HOST_ID;
    SEMRESATTRS_HOST_NAME = TMP_HOST_NAME;
    SEMRESATTRS_HOST_TYPE = TMP_HOST_TYPE;
    SEMRESATTRS_HOST_ARCH = TMP_HOST_ARCH;
    SEMRESATTRS_HOST_IMAGE_NAME = TMP_HOST_IMAGE_NAME;
    SEMRESATTRS_HOST_IMAGE_ID = TMP_HOST_IMAGE_ID;
    SEMRESATTRS_HOST_IMAGE_VERSION = TMP_HOST_IMAGE_VERSION;
    SEMRESATTRS_K8S_CLUSTER_NAME = TMP_K8S_CLUSTER_NAME;
    SEMRESATTRS_K8S_NODE_NAME = TMP_K8S_NODE_NAME;
    SEMRESATTRS_K8S_NODE_UID = TMP_K8S_NODE_UID;
    SEMRESATTRS_K8S_NAMESPACE_NAME = TMP_K8S_NAMESPACE_NAME;
    SEMRESATTRS_K8S_POD_UID = TMP_K8S_POD_UID;
    SEMRESATTRS_K8S_POD_NAME = TMP_K8S_POD_NAME;
    SEMRESATTRS_K8S_CONTAINER_NAME = TMP_K8S_CONTAINER_NAME;
    SEMRESATTRS_K8S_REPLICASET_UID = TMP_K8S_REPLICASET_UID;
    SEMRESATTRS_K8S_REPLICASET_NAME = TMP_K8S_REPLICASET_NAME;
    SEMRESATTRS_K8S_DEPLOYMENT_UID = TMP_K8S_DEPLOYMENT_UID;
    SEMRESATTRS_K8S_DEPLOYMENT_NAME = TMP_K8S_DEPLOYMENT_NAME;
    SEMRESATTRS_K8S_STATEFULSET_UID = TMP_K8S_STATEFULSET_UID;
    SEMRESATTRS_K8S_STATEFULSET_NAME = TMP_K8S_STATEFULSET_NAME;
    SEMRESATTRS_K8S_DAEMONSET_UID = TMP_K8S_DAEMONSET_UID;
    SEMRESATTRS_K8S_DAEMONSET_NAME = TMP_K8S_DAEMONSET_NAME;
    SEMRESATTRS_K8S_JOB_UID = TMP_K8S_JOB_UID;
    SEMRESATTRS_K8S_JOB_NAME = TMP_K8S_JOB_NAME;
    SEMRESATTRS_K8S_CRONJOB_UID = TMP_K8S_CRONJOB_UID;
    SEMRESATTRS_K8S_CRONJOB_NAME = TMP_K8S_CRONJOB_NAME;
    SEMRESATTRS_OS_TYPE = TMP_OS_TYPE;
    SEMRESATTRS_OS_DESCRIPTION = TMP_OS_DESCRIPTION;
    SEMRESATTRS_OS_NAME = TMP_OS_NAME;
    SEMRESATTRS_OS_VERSION = TMP_OS_VERSION;
    SEMRESATTRS_PROCESS_PID = TMP_PROCESS_PID;
    SEMRESATTRS_PROCESS_EXECUTABLE_NAME = TMP_PROCESS_EXECUTABLE_NAME;
    SEMRESATTRS_PROCESS_EXECUTABLE_PATH = TMP_PROCESS_EXECUTABLE_PATH;
    SEMRESATTRS_PROCESS_COMMAND = TMP_PROCESS_COMMAND;
    SEMRESATTRS_PROCESS_COMMAND_LINE = TMP_PROCESS_COMMAND_LINE;
    SEMRESATTRS_PROCESS_COMMAND_ARGS = TMP_PROCESS_COMMAND_ARGS;
    SEMRESATTRS_PROCESS_OWNER = TMP_PROCESS_OWNER;
    SEMRESATTRS_PROCESS_RUNTIME_NAME = TMP_PROCESS_RUNTIME_NAME;
    SEMRESATTRS_PROCESS_RUNTIME_VERSION = TMP_PROCESS_RUNTIME_VERSION;
    SEMRESATTRS_PROCESS_RUNTIME_DESCRIPTION = TMP_PROCESS_RUNTIME_DESCRIPTION;
    SEMRESATTRS_SERVICE_NAME = TMP_SERVICE_NAME;
    SEMRESATTRS_SERVICE_NAMESPACE = TMP_SERVICE_NAMESPACE;
    SEMRESATTRS_SERVICE_INSTANCE_ID = TMP_SERVICE_INSTANCE_ID;
    SEMRESATTRS_SERVICE_VERSION = TMP_SERVICE_VERSION;
    SEMRESATTRS_TELEMETRY_SDK_NAME = TMP_TELEMETRY_SDK_NAME;
    SEMRESATTRS_TELEMETRY_SDK_LANGUAGE = TMP_TELEMETRY_SDK_LANGUAGE;
    SEMRESATTRS_TELEMETRY_SDK_VERSION = TMP_TELEMETRY_SDK_VERSION;
    SEMRESATTRS_TELEMETRY_AUTO_VERSION = TMP_TELEMETRY_AUTO_VERSION;
    SEMRESATTRS_WEBENGINE_NAME = TMP_WEBENGINE_NAME;
    SEMRESATTRS_WEBENGINE_VERSION = TMP_WEBENGINE_VERSION;
    SEMRESATTRS_WEBENGINE_DESCRIPTION = TMP_WEBENGINE_DESCRIPTION;
    SemanticResourceAttributes = /* @__PURE__ */ createConstMap([
      TMP_CLOUD_PROVIDER,
      TMP_CLOUD_ACCOUNT_ID,
      TMP_CLOUD_REGION,
      TMP_CLOUD_AVAILABILITY_ZONE,
      TMP_CLOUD_PLATFORM,
      TMP_AWS_ECS_CONTAINER_ARN,
      TMP_AWS_ECS_CLUSTER_ARN,
      TMP_AWS_ECS_LAUNCHTYPE,
      TMP_AWS_ECS_TASK_ARN,
      TMP_AWS_ECS_TASK_FAMILY,
      TMP_AWS_ECS_TASK_REVISION,
      TMP_AWS_EKS_CLUSTER_ARN,
      TMP_AWS_LOG_GROUP_NAMES,
      TMP_AWS_LOG_GROUP_ARNS,
      TMP_AWS_LOG_STREAM_NAMES,
      TMP_AWS_LOG_STREAM_ARNS,
      TMP_CONTAINER_NAME,
      TMP_CONTAINER_ID,
      TMP_CONTAINER_RUNTIME,
      TMP_CONTAINER_IMAGE_NAME,
      TMP_CONTAINER_IMAGE_TAG,
      TMP_DEPLOYMENT_ENVIRONMENT,
      TMP_DEVICE_ID,
      TMP_DEVICE_MODEL_IDENTIFIER,
      TMP_DEVICE_MODEL_NAME,
      TMP_FAAS_NAME,
      TMP_FAAS_ID,
      TMP_FAAS_VERSION,
      TMP_FAAS_INSTANCE,
      TMP_FAAS_MAX_MEMORY,
      TMP_HOST_ID,
      TMP_HOST_NAME,
      TMP_HOST_TYPE,
      TMP_HOST_ARCH,
      TMP_HOST_IMAGE_NAME,
      TMP_HOST_IMAGE_ID,
      TMP_HOST_IMAGE_VERSION,
      TMP_K8S_CLUSTER_NAME,
      TMP_K8S_NODE_NAME,
      TMP_K8S_NODE_UID,
      TMP_K8S_NAMESPACE_NAME,
      TMP_K8S_POD_UID,
      TMP_K8S_POD_NAME,
      TMP_K8S_CONTAINER_NAME,
      TMP_K8S_REPLICASET_UID,
      TMP_K8S_REPLICASET_NAME,
      TMP_K8S_DEPLOYMENT_UID,
      TMP_K8S_DEPLOYMENT_NAME,
      TMP_K8S_STATEFULSET_UID,
      TMP_K8S_STATEFULSET_NAME,
      TMP_K8S_DAEMONSET_UID,
      TMP_K8S_DAEMONSET_NAME,
      TMP_K8S_JOB_UID,
      TMP_K8S_JOB_NAME,
      TMP_K8S_CRONJOB_UID,
      TMP_K8S_CRONJOB_NAME,
      TMP_OS_TYPE,
      TMP_OS_DESCRIPTION,
      TMP_OS_NAME,
      TMP_OS_VERSION,
      TMP_PROCESS_PID,
      TMP_PROCESS_EXECUTABLE_NAME,
      TMP_PROCESS_EXECUTABLE_PATH,
      TMP_PROCESS_COMMAND,
      TMP_PROCESS_COMMAND_LINE,
      TMP_PROCESS_COMMAND_ARGS,
      TMP_PROCESS_OWNER,
      TMP_PROCESS_RUNTIME_NAME,
      TMP_PROCESS_RUNTIME_VERSION,
      TMP_PROCESS_RUNTIME_DESCRIPTION,
      TMP_SERVICE_NAME,
      TMP_SERVICE_NAMESPACE,
      TMP_SERVICE_INSTANCE_ID,
      TMP_SERVICE_VERSION,
      TMP_TELEMETRY_SDK_NAME,
      TMP_TELEMETRY_SDK_LANGUAGE,
      TMP_TELEMETRY_SDK_VERSION,
      TMP_TELEMETRY_AUTO_VERSION,
      TMP_WEBENGINE_NAME,
      TMP_WEBENGINE_VERSION,
      TMP_WEBENGINE_DESCRIPTION
    ]);
    TMP_CLOUDPROVIDERVALUES_ALIBABA_CLOUD = "alibaba_cloud";
    TMP_CLOUDPROVIDERVALUES_AWS = "aws";
    TMP_CLOUDPROVIDERVALUES_AZURE = "azure";
    TMP_CLOUDPROVIDERVALUES_GCP = "gcp";
    CLOUDPROVIDERVALUES_ALIBABA_CLOUD = TMP_CLOUDPROVIDERVALUES_ALIBABA_CLOUD;
    CLOUDPROVIDERVALUES_AWS = TMP_CLOUDPROVIDERVALUES_AWS;
    CLOUDPROVIDERVALUES_AZURE = TMP_CLOUDPROVIDERVALUES_AZURE;
    CLOUDPROVIDERVALUES_GCP = TMP_CLOUDPROVIDERVALUES_GCP;
    CloudProviderValues = /* @__PURE__ */ createConstMap([
      TMP_CLOUDPROVIDERVALUES_ALIBABA_CLOUD,
      TMP_CLOUDPROVIDERVALUES_AWS,
      TMP_CLOUDPROVIDERVALUES_AZURE,
      TMP_CLOUDPROVIDERVALUES_GCP
    ]);
    TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS = "alibaba_cloud_ecs";
    TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC = "alibaba_cloud_fc";
    TMP_CLOUDPLATFORMVALUES_AWS_EC2 = "aws_ec2";
    TMP_CLOUDPLATFORMVALUES_AWS_ECS = "aws_ecs";
    TMP_CLOUDPLATFORMVALUES_AWS_EKS = "aws_eks";
    TMP_CLOUDPLATFORMVALUES_AWS_LAMBDA = "aws_lambda";
    TMP_CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK = "aws_elastic_beanstalk";
    TMP_CLOUDPLATFORMVALUES_AZURE_VM = "azure_vm";
    TMP_CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES = "azure_container_instances";
    TMP_CLOUDPLATFORMVALUES_AZURE_AKS = "azure_aks";
    TMP_CLOUDPLATFORMVALUES_AZURE_FUNCTIONS = "azure_functions";
    TMP_CLOUDPLATFORMVALUES_AZURE_APP_SERVICE = "azure_app_service";
    TMP_CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE = "gcp_compute_engine";
    TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_RUN = "gcp_cloud_run";
    TMP_CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE = "gcp_kubernetes_engine";
    TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS = "gcp_cloud_functions";
    TMP_CLOUDPLATFORMVALUES_GCP_APP_ENGINE = "gcp_app_engine";
    CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS = TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS;
    CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC = TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC;
    CLOUDPLATFORMVALUES_AWS_EC2 = TMP_CLOUDPLATFORMVALUES_AWS_EC2;
    CLOUDPLATFORMVALUES_AWS_ECS = TMP_CLOUDPLATFORMVALUES_AWS_ECS;
    CLOUDPLATFORMVALUES_AWS_EKS = TMP_CLOUDPLATFORMVALUES_AWS_EKS;
    CLOUDPLATFORMVALUES_AWS_LAMBDA = TMP_CLOUDPLATFORMVALUES_AWS_LAMBDA;
    CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK = TMP_CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK;
    CLOUDPLATFORMVALUES_AZURE_VM = TMP_CLOUDPLATFORMVALUES_AZURE_VM;
    CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES = TMP_CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES;
    CLOUDPLATFORMVALUES_AZURE_AKS = TMP_CLOUDPLATFORMVALUES_AZURE_AKS;
    CLOUDPLATFORMVALUES_AZURE_FUNCTIONS = TMP_CLOUDPLATFORMVALUES_AZURE_FUNCTIONS;
    CLOUDPLATFORMVALUES_AZURE_APP_SERVICE = TMP_CLOUDPLATFORMVALUES_AZURE_APP_SERVICE;
    CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE = TMP_CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE;
    CLOUDPLATFORMVALUES_GCP_CLOUD_RUN = TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_RUN;
    CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE = TMP_CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE;
    CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS = TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS;
    CLOUDPLATFORMVALUES_GCP_APP_ENGINE = TMP_CLOUDPLATFORMVALUES_GCP_APP_ENGINE;
    CloudPlatformValues = /* @__PURE__ */ createConstMap([
      TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS,
      TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC,
      TMP_CLOUDPLATFORMVALUES_AWS_EC2,
      TMP_CLOUDPLATFORMVALUES_AWS_ECS,
      TMP_CLOUDPLATFORMVALUES_AWS_EKS,
      TMP_CLOUDPLATFORMVALUES_AWS_LAMBDA,
      TMP_CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK,
      TMP_CLOUDPLATFORMVALUES_AZURE_VM,
      TMP_CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES,
      TMP_CLOUDPLATFORMVALUES_AZURE_AKS,
      TMP_CLOUDPLATFORMVALUES_AZURE_FUNCTIONS,
      TMP_CLOUDPLATFORMVALUES_AZURE_APP_SERVICE,
      TMP_CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE,
      TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_RUN,
      TMP_CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE,
      TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS,
      TMP_CLOUDPLATFORMVALUES_GCP_APP_ENGINE
    ]);
    TMP_AWSECSLAUNCHTYPEVALUES_EC2 = "ec2";
    TMP_AWSECSLAUNCHTYPEVALUES_FARGATE = "fargate";
    AWSECSLAUNCHTYPEVALUES_EC2 = TMP_AWSECSLAUNCHTYPEVALUES_EC2;
    AWSECSLAUNCHTYPEVALUES_FARGATE = TMP_AWSECSLAUNCHTYPEVALUES_FARGATE;
    AwsEcsLaunchtypeValues = /* @__PURE__ */ createConstMap([
      TMP_AWSECSLAUNCHTYPEVALUES_EC2,
      TMP_AWSECSLAUNCHTYPEVALUES_FARGATE
    ]);
    TMP_HOSTARCHVALUES_AMD64 = "amd64";
    TMP_HOSTARCHVALUES_ARM32 = "arm32";
    TMP_HOSTARCHVALUES_ARM64 = "arm64";
    TMP_HOSTARCHVALUES_IA64 = "ia64";
    TMP_HOSTARCHVALUES_PPC32 = "ppc32";
    TMP_HOSTARCHVALUES_PPC64 = "ppc64";
    TMP_HOSTARCHVALUES_X86 = "x86";
    HOSTARCHVALUES_AMD64 = TMP_HOSTARCHVALUES_AMD64;
    HOSTARCHVALUES_ARM32 = TMP_HOSTARCHVALUES_ARM32;
    HOSTARCHVALUES_ARM64 = TMP_HOSTARCHVALUES_ARM64;
    HOSTARCHVALUES_IA64 = TMP_HOSTARCHVALUES_IA64;
    HOSTARCHVALUES_PPC32 = TMP_HOSTARCHVALUES_PPC32;
    HOSTARCHVALUES_PPC64 = TMP_HOSTARCHVALUES_PPC64;
    HOSTARCHVALUES_X86 = TMP_HOSTARCHVALUES_X86;
    HostArchValues = /* @__PURE__ */ createConstMap([
      TMP_HOSTARCHVALUES_AMD64,
      TMP_HOSTARCHVALUES_ARM32,
      TMP_HOSTARCHVALUES_ARM64,
      TMP_HOSTARCHVALUES_IA64,
      TMP_HOSTARCHVALUES_PPC32,
      TMP_HOSTARCHVALUES_PPC64,
      TMP_HOSTARCHVALUES_X86
    ]);
    TMP_OSTYPEVALUES_WINDOWS = "windows";
    TMP_OSTYPEVALUES_LINUX = "linux";
    TMP_OSTYPEVALUES_DARWIN = "darwin";
    TMP_OSTYPEVALUES_FREEBSD = "freebsd";
    TMP_OSTYPEVALUES_NETBSD = "netbsd";
    TMP_OSTYPEVALUES_OPENBSD = "openbsd";
    TMP_OSTYPEVALUES_DRAGONFLYBSD = "dragonflybsd";
    TMP_OSTYPEVALUES_HPUX = "hpux";
    TMP_OSTYPEVALUES_AIX = "aix";
    TMP_OSTYPEVALUES_SOLARIS = "solaris";
    TMP_OSTYPEVALUES_Z_OS = "z_os";
    OSTYPEVALUES_WINDOWS = TMP_OSTYPEVALUES_WINDOWS;
    OSTYPEVALUES_LINUX = TMP_OSTYPEVALUES_LINUX;
    OSTYPEVALUES_DARWIN = TMP_OSTYPEVALUES_DARWIN;
    OSTYPEVALUES_FREEBSD = TMP_OSTYPEVALUES_FREEBSD;
    OSTYPEVALUES_NETBSD = TMP_OSTYPEVALUES_NETBSD;
    OSTYPEVALUES_OPENBSD = TMP_OSTYPEVALUES_OPENBSD;
    OSTYPEVALUES_DRAGONFLYBSD = TMP_OSTYPEVALUES_DRAGONFLYBSD;
    OSTYPEVALUES_HPUX = TMP_OSTYPEVALUES_HPUX;
    OSTYPEVALUES_AIX = TMP_OSTYPEVALUES_AIX;
    OSTYPEVALUES_SOLARIS = TMP_OSTYPEVALUES_SOLARIS;
    OSTYPEVALUES_Z_OS = TMP_OSTYPEVALUES_Z_OS;
    OsTypeValues = /* @__PURE__ */ createConstMap([
      TMP_OSTYPEVALUES_WINDOWS,
      TMP_OSTYPEVALUES_LINUX,
      TMP_OSTYPEVALUES_DARWIN,
      TMP_OSTYPEVALUES_FREEBSD,
      TMP_OSTYPEVALUES_NETBSD,
      TMP_OSTYPEVALUES_OPENBSD,
      TMP_OSTYPEVALUES_DRAGONFLYBSD,
      TMP_OSTYPEVALUES_HPUX,
      TMP_OSTYPEVALUES_AIX,
      TMP_OSTYPEVALUES_SOLARIS,
      TMP_OSTYPEVALUES_Z_OS
    ]);
    TMP_TELEMETRYSDKLANGUAGEVALUES_CPP = "cpp";
    TMP_TELEMETRYSDKLANGUAGEVALUES_DOTNET = "dotnet";
    TMP_TELEMETRYSDKLANGUAGEVALUES_ERLANG = "erlang";
    TMP_TELEMETRYSDKLANGUAGEVALUES_GO = "go";
    TMP_TELEMETRYSDKLANGUAGEVALUES_JAVA = "java";
    TMP_TELEMETRYSDKLANGUAGEVALUES_NODEJS = "nodejs";
    TMP_TELEMETRYSDKLANGUAGEVALUES_PHP = "php";
    TMP_TELEMETRYSDKLANGUAGEVALUES_PYTHON = "python";
    TMP_TELEMETRYSDKLANGUAGEVALUES_RUBY = "ruby";
    TMP_TELEMETRYSDKLANGUAGEVALUES_WEBJS = "webjs";
    TELEMETRYSDKLANGUAGEVALUES_CPP = TMP_TELEMETRYSDKLANGUAGEVALUES_CPP;
    TELEMETRYSDKLANGUAGEVALUES_DOTNET = TMP_TELEMETRYSDKLANGUAGEVALUES_DOTNET;
    TELEMETRYSDKLANGUAGEVALUES_ERLANG = TMP_TELEMETRYSDKLANGUAGEVALUES_ERLANG;
    TELEMETRYSDKLANGUAGEVALUES_GO = TMP_TELEMETRYSDKLANGUAGEVALUES_GO;
    TELEMETRYSDKLANGUAGEVALUES_JAVA = TMP_TELEMETRYSDKLANGUAGEVALUES_JAVA;
    TELEMETRYSDKLANGUAGEVALUES_NODEJS = TMP_TELEMETRYSDKLANGUAGEVALUES_NODEJS;
    TELEMETRYSDKLANGUAGEVALUES_PHP = TMP_TELEMETRYSDKLANGUAGEVALUES_PHP;
    TELEMETRYSDKLANGUAGEVALUES_PYTHON = TMP_TELEMETRYSDKLANGUAGEVALUES_PYTHON;
    TELEMETRYSDKLANGUAGEVALUES_RUBY = TMP_TELEMETRYSDKLANGUAGEVALUES_RUBY;
    TELEMETRYSDKLANGUAGEVALUES_WEBJS = TMP_TELEMETRYSDKLANGUAGEVALUES_WEBJS;
    TelemetrySdkLanguageValues = /* @__PURE__ */ createConstMap([
      TMP_TELEMETRYSDKLANGUAGEVALUES_CPP,
      TMP_TELEMETRYSDKLANGUAGEVALUES_DOTNET,
      TMP_TELEMETRYSDKLANGUAGEVALUES_ERLANG,
      TMP_TELEMETRYSDKLANGUAGEVALUES_GO,
      TMP_TELEMETRYSDKLANGUAGEVALUES_JAVA,
      TMP_TELEMETRYSDKLANGUAGEVALUES_NODEJS,
      TMP_TELEMETRYSDKLANGUAGEVALUES_PHP,
      TMP_TELEMETRYSDKLANGUAGEVALUES_PYTHON,
      TMP_TELEMETRYSDKLANGUAGEVALUES_RUBY,
      TMP_TELEMETRYSDKLANGUAGEVALUES_WEBJS
    ]);
  }
});

// node_modules/@opentelemetry/semantic-conventions/build/esm/resource/index.js
var init_resource = __esm({
  "node_modules/@opentelemetry/semantic-conventions/build/esm/resource/index.js"() {
    init_SemanticResourceAttributes();
  }
});

// node_modules/@opentelemetry/semantic-conventions/build/esm/stable_attributes.js
var ATTR_ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT, ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_ABORTED, ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_HANDLED, ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_SKIPPED, ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_UNHANDLED, ATTR_ASPNETCORE_DIAGNOSTICS_HANDLER_TYPE, ATTR_ASPNETCORE_RATE_LIMITING_POLICY, ATTR_ASPNETCORE_RATE_LIMITING_RESULT, ASPNETCORE_RATE_LIMITING_RESULT_VALUE_ACQUIRED, ASPNETCORE_RATE_LIMITING_RESULT_VALUE_ENDPOINT_LIMITER, ASPNETCORE_RATE_LIMITING_RESULT_VALUE_GLOBAL_LIMITER, ASPNETCORE_RATE_LIMITING_RESULT_VALUE_REQUEST_CANCELED, ATTR_ASPNETCORE_REQUEST_IS_UNHANDLED, ATTR_ASPNETCORE_ROUTING_IS_FALLBACK, ATTR_ASPNETCORE_ROUTING_MATCH_STATUS, ASPNETCORE_ROUTING_MATCH_STATUS_VALUE_FAILURE, ASPNETCORE_ROUTING_MATCH_STATUS_VALUE_SUCCESS, ATTR_ASPNETCORE_USER_IS_AUTHENTICATED, ATTR_CLIENT_ADDRESS, ATTR_CLIENT_PORT, ATTR_CODE_COLUMN_NUMBER, ATTR_CODE_FILE_PATH, ATTR_CODE_FUNCTION_NAME, ATTR_CODE_LINE_NUMBER, ATTR_CODE_STACKTRACE, ATTR_DB_COLLECTION_NAME, ATTR_DB_NAMESPACE, ATTR_DB_OPERATION_BATCH_SIZE, ATTR_DB_OPERATION_NAME, ATTR_DB_QUERY_SUMMARY, ATTR_DB_QUERY_TEXT, ATTR_DB_RESPONSE_STATUS_CODE, ATTR_DB_STORED_PROCEDURE_NAME, ATTR_DB_SYSTEM_NAME, DB_SYSTEM_NAME_VALUE_MARIADB, DB_SYSTEM_NAME_VALUE_MICROSOFT_SQL_SERVER, DB_SYSTEM_NAME_VALUE_MYSQL, DB_SYSTEM_NAME_VALUE_POSTGRESQL, ATTR_DOTNET_GC_HEAP_GENERATION, DOTNET_GC_HEAP_GENERATION_VALUE_GEN0, DOTNET_GC_HEAP_GENERATION_VALUE_GEN1, DOTNET_GC_HEAP_GENERATION_VALUE_GEN2, DOTNET_GC_HEAP_GENERATION_VALUE_LOH, DOTNET_GC_HEAP_GENERATION_VALUE_POH, ATTR_ERROR_TYPE, ERROR_TYPE_VALUE_OTHER, ATTR_EXCEPTION_ESCAPED, ATTR_EXCEPTION_MESSAGE, ATTR_EXCEPTION_STACKTRACE, ATTR_EXCEPTION_TYPE, ATTR_HTTP_REQUEST_HEADER, ATTR_HTTP_REQUEST_METHOD, HTTP_REQUEST_METHOD_VALUE_OTHER, HTTP_REQUEST_METHOD_VALUE_CONNECT, HTTP_REQUEST_METHOD_VALUE_DELETE, HTTP_REQUEST_METHOD_VALUE_GET, HTTP_REQUEST_METHOD_VALUE_HEAD, HTTP_REQUEST_METHOD_VALUE_OPTIONS, HTTP_REQUEST_METHOD_VALUE_PATCH, HTTP_REQUEST_METHOD_VALUE_POST, HTTP_REQUEST_METHOD_VALUE_PUT, HTTP_REQUEST_METHOD_VALUE_TRACE, ATTR_HTTP_REQUEST_METHOD_ORIGINAL, ATTR_HTTP_REQUEST_RESEND_COUNT, ATTR_HTTP_RESPONSE_HEADER, ATTR_HTTP_RESPONSE_STATUS_CODE, ATTR_HTTP_ROUTE, ATTR_JVM_GC_ACTION, ATTR_JVM_GC_NAME, ATTR_JVM_MEMORY_POOL_NAME, ATTR_JVM_MEMORY_TYPE, JVM_MEMORY_TYPE_VALUE_HEAP, JVM_MEMORY_TYPE_VALUE_NON_HEAP, ATTR_JVM_THREAD_DAEMON, ATTR_JVM_THREAD_STATE, JVM_THREAD_STATE_VALUE_BLOCKED, JVM_THREAD_STATE_VALUE_NEW, JVM_THREAD_STATE_VALUE_RUNNABLE, JVM_THREAD_STATE_VALUE_TERMINATED, JVM_THREAD_STATE_VALUE_TIMED_WAITING, JVM_THREAD_STATE_VALUE_WAITING, ATTR_NETWORK_LOCAL_ADDRESS, ATTR_NETWORK_LOCAL_PORT, ATTR_NETWORK_PEER_ADDRESS, ATTR_NETWORK_PEER_PORT, ATTR_NETWORK_PROTOCOL_NAME, ATTR_NETWORK_PROTOCOL_VERSION, ATTR_NETWORK_TRANSPORT, NETWORK_TRANSPORT_VALUE_PIPE, NETWORK_TRANSPORT_VALUE_QUIC, NETWORK_TRANSPORT_VALUE_TCP, NETWORK_TRANSPORT_VALUE_UDP, NETWORK_TRANSPORT_VALUE_UNIX, ATTR_NETWORK_TYPE, NETWORK_TYPE_VALUE_IPV4, NETWORK_TYPE_VALUE_IPV6, ATTR_OTEL_SCOPE_NAME, ATTR_OTEL_SCOPE_VERSION, ATTR_OTEL_STATUS_CODE, OTEL_STATUS_CODE_VALUE_ERROR, OTEL_STATUS_CODE_VALUE_OK, ATTR_OTEL_STATUS_DESCRIPTION, ATTR_SERVER_ADDRESS, ATTR_SERVER_PORT, ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, ATTR_SIGNALR_CONNECTION_STATUS, SIGNALR_CONNECTION_STATUS_VALUE_APP_SHUTDOWN, SIGNALR_CONNECTION_STATUS_VALUE_NORMAL_CLOSURE, SIGNALR_CONNECTION_STATUS_VALUE_TIMEOUT, ATTR_SIGNALR_TRANSPORT, SIGNALR_TRANSPORT_VALUE_LONG_POLLING, SIGNALR_TRANSPORT_VALUE_SERVER_SENT_EVENTS, SIGNALR_TRANSPORT_VALUE_WEB_SOCKETS, ATTR_TELEMETRY_SDK_LANGUAGE, TELEMETRY_SDK_LANGUAGE_VALUE_CPP, TELEMETRY_SDK_LANGUAGE_VALUE_DOTNET, TELEMETRY_SDK_LANGUAGE_VALUE_ERLANG, TELEMETRY_SDK_LANGUAGE_VALUE_GO, TELEMETRY_SDK_LANGUAGE_VALUE_JAVA, TELEMETRY_SDK_LANGUAGE_VALUE_NODEJS, TELEMETRY_SDK_LANGUAGE_VALUE_PHP, TELEMETRY_SDK_LANGUAGE_VALUE_PYTHON, TELEMETRY_SDK_LANGUAGE_VALUE_RUBY, TELEMETRY_SDK_LANGUAGE_VALUE_RUST, TELEMETRY_SDK_LANGUAGE_VALUE_SWIFT, TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS, ATTR_TELEMETRY_SDK_NAME, ATTR_TELEMETRY_SDK_VERSION, ATTR_URL_FRAGMENT, ATTR_URL_FULL, ATTR_URL_PATH, ATTR_URL_QUERY, ATTR_URL_SCHEME, ATTR_USER_AGENT_ORIGINAL;
var init_stable_attributes = __esm({
  "node_modules/@opentelemetry/semantic-conventions/build/esm/stable_attributes.js"() {
    ATTR_ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT = "aspnetcore.diagnostics.exception.result";
    ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_ABORTED = "aborted";
    ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_HANDLED = "handled";
    ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_SKIPPED = "skipped";
    ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_UNHANDLED = "unhandled";
    ATTR_ASPNETCORE_DIAGNOSTICS_HANDLER_TYPE = "aspnetcore.diagnostics.handler.type";
    ATTR_ASPNETCORE_RATE_LIMITING_POLICY = "aspnetcore.rate_limiting.policy";
    ATTR_ASPNETCORE_RATE_LIMITING_RESULT = "aspnetcore.rate_limiting.result";
    ASPNETCORE_RATE_LIMITING_RESULT_VALUE_ACQUIRED = "acquired";
    ASPNETCORE_RATE_LIMITING_RESULT_VALUE_ENDPOINT_LIMITER = "endpoint_limiter";
    ASPNETCORE_RATE_LIMITING_RESULT_VALUE_GLOBAL_LIMITER = "global_limiter";
    ASPNETCORE_RATE_LIMITING_RESULT_VALUE_REQUEST_CANCELED = "request_canceled";
    ATTR_ASPNETCORE_REQUEST_IS_UNHANDLED = "aspnetcore.request.is_unhandled";
    ATTR_ASPNETCORE_ROUTING_IS_FALLBACK = "aspnetcore.routing.is_fallback";
    ATTR_ASPNETCORE_ROUTING_MATCH_STATUS = "aspnetcore.routing.match_status";
    ASPNETCORE_ROUTING_MATCH_STATUS_VALUE_FAILURE = "failure";
    ASPNETCORE_ROUTING_MATCH_STATUS_VALUE_SUCCESS = "success";
    ATTR_ASPNETCORE_USER_IS_AUTHENTICATED = "aspnetcore.user.is_authenticated";
    ATTR_CLIENT_ADDRESS = "client.address";
    ATTR_CLIENT_PORT = "client.port";
    ATTR_CODE_COLUMN_NUMBER = "code.column.number";
    ATTR_CODE_FILE_PATH = "code.file.path";
    ATTR_CODE_FUNCTION_NAME = "code.function.name";
    ATTR_CODE_LINE_NUMBER = "code.line.number";
    ATTR_CODE_STACKTRACE = "code.stacktrace";
    ATTR_DB_COLLECTION_NAME = "db.collection.name";
    ATTR_DB_NAMESPACE = "db.namespace";
    ATTR_DB_OPERATION_BATCH_SIZE = "db.operation.batch.size";
    ATTR_DB_OPERATION_NAME = "db.operation.name";
    ATTR_DB_QUERY_SUMMARY = "db.query.summary";
    ATTR_DB_QUERY_TEXT = "db.query.text";
    ATTR_DB_RESPONSE_STATUS_CODE = "db.response.status_code";
    ATTR_DB_STORED_PROCEDURE_NAME = "db.stored_procedure.name";
    ATTR_DB_SYSTEM_NAME = "db.system.name";
    DB_SYSTEM_NAME_VALUE_MARIADB = "mariadb";
    DB_SYSTEM_NAME_VALUE_MICROSOFT_SQL_SERVER = "microsoft.sql_server";
    DB_SYSTEM_NAME_VALUE_MYSQL = "mysql";
    DB_SYSTEM_NAME_VALUE_POSTGRESQL = "postgresql";
    ATTR_DOTNET_GC_HEAP_GENERATION = "dotnet.gc.heap.generation";
    DOTNET_GC_HEAP_GENERATION_VALUE_GEN0 = "gen0";
    DOTNET_GC_HEAP_GENERATION_VALUE_GEN1 = "gen1";
    DOTNET_GC_HEAP_GENERATION_VALUE_GEN2 = "gen2";
    DOTNET_GC_HEAP_GENERATION_VALUE_LOH = "loh";
    DOTNET_GC_HEAP_GENERATION_VALUE_POH = "poh";
    ATTR_ERROR_TYPE = "error.type";
    ERROR_TYPE_VALUE_OTHER = "_OTHER";
    ATTR_EXCEPTION_ESCAPED = "exception.escaped";
    ATTR_EXCEPTION_MESSAGE = "exception.message";
    ATTR_EXCEPTION_STACKTRACE = "exception.stacktrace";
    ATTR_EXCEPTION_TYPE = "exception.type";
    ATTR_HTTP_REQUEST_HEADER = (key) => `http.request.header.${key}`;
    ATTR_HTTP_REQUEST_METHOD = "http.request.method";
    HTTP_REQUEST_METHOD_VALUE_OTHER = "_OTHER";
    HTTP_REQUEST_METHOD_VALUE_CONNECT = "CONNECT";
    HTTP_REQUEST_METHOD_VALUE_DELETE = "DELETE";
    HTTP_REQUEST_METHOD_VALUE_GET = "GET";
    HTTP_REQUEST_METHOD_VALUE_HEAD = "HEAD";
    HTTP_REQUEST_METHOD_VALUE_OPTIONS = "OPTIONS";
    HTTP_REQUEST_METHOD_VALUE_PATCH = "PATCH";
    HTTP_REQUEST_METHOD_VALUE_POST = "POST";
    HTTP_REQUEST_METHOD_VALUE_PUT = "PUT";
    HTTP_REQUEST_METHOD_VALUE_TRACE = "TRACE";
    ATTR_HTTP_REQUEST_METHOD_ORIGINAL = "http.request.method_original";
    ATTR_HTTP_REQUEST_RESEND_COUNT = "http.request.resend_count";
    ATTR_HTTP_RESPONSE_HEADER = (key) => `http.response.header.${key}`;
    ATTR_HTTP_RESPONSE_STATUS_CODE = "http.response.status_code";
    ATTR_HTTP_ROUTE = "http.route";
    ATTR_JVM_GC_ACTION = "jvm.gc.action";
    ATTR_JVM_GC_NAME = "jvm.gc.name";
    ATTR_JVM_MEMORY_POOL_NAME = "jvm.memory.pool.name";
    ATTR_JVM_MEMORY_TYPE = "jvm.memory.type";
    JVM_MEMORY_TYPE_VALUE_HEAP = "heap";
    JVM_MEMORY_TYPE_VALUE_NON_HEAP = "non_heap";
    ATTR_JVM_THREAD_DAEMON = "jvm.thread.daemon";
    ATTR_JVM_THREAD_STATE = "jvm.thread.state";
    JVM_THREAD_STATE_VALUE_BLOCKED = "blocked";
    JVM_THREAD_STATE_VALUE_NEW = "new";
    JVM_THREAD_STATE_VALUE_RUNNABLE = "runnable";
    JVM_THREAD_STATE_VALUE_TERMINATED = "terminated";
    JVM_THREAD_STATE_VALUE_TIMED_WAITING = "timed_waiting";
    JVM_THREAD_STATE_VALUE_WAITING = "waiting";
    ATTR_NETWORK_LOCAL_ADDRESS = "network.local.address";
    ATTR_NETWORK_LOCAL_PORT = "network.local.port";
    ATTR_NETWORK_PEER_ADDRESS = "network.peer.address";
    ATTR_NETWORK_PEER_PORT = "network.peer.port";
    ATTR_NETWORK_PROTOCOL_NAME = "network.protocol.name";
    ATTR_NETWORK_PROTOCOL_VERSION = "network.protocol.version";
    ATTR_NETWORK_TRANSPORT = "network.transport";
    NETWORK_TRANSPORT_VALUE_PIPE = "pipe";
    NETWORK_TRANSPORT_VALUE_QUIC = "quic";
    NETWORK_TRANSPORT_VALUE_TCP = "tcp";
    NETWORK_TRANSPORT_VALUE_UDP = "udp";
    NETWORK_TRANSPORT_VALUE_UNIX = "unix";
    ATTR_NETWORK_TYPE = "network.type";
    NETWORK_TYPE_VALUE_IPV4 = "ipv4";
    NETWORK_TYPE_VALUE_IPV6 = "ipv6";
    ATTR_OTEL_SCOPE_NAME = "otel.scope.name";
    ATTR_OTEL_SCOPE_VERSION = "otel.scope.version";
    ATTR_OTEL_STATUS_CODE = "otel.status_code";
    OTEL_STATUS_CODE_VALUE_ERROR = "ERROR";
    OTEL_STATUS_CODE_VALUE_OK = "OK";
    ATTR_OTEL_STATUS_DESCRIPTION = "otel.status_description";
    ATTR_SERVER_ADDRESS = "server.address";
    ATTR_SERVER_PORT = "server.port";
    ATTR_SERVICE_NAME = "service.name";
    ATTR_SERVICE_VERSION = "service.version";
    ATTR_SIGNALR_CONNECTION_STATUS = "signalr.connection.status";
    SIGNALR_CONNECTION_STATUS_VALUE_APP_SHUTDOWN = "app_shutdown";
    SIGNALR_CONNECTION_STATUS_VALUE_NORMAL_CLOSURE = "normal_closure";
    SIGNALR_CONNECTION_STATUS_VALUE_TIMEOUT = "timeout";
    ATTR_SIGNALR_TRANSPORT = "signalr.transport";
    SIGNALR_TRANSPORT_VALUE_LONG_POLLING = "long_polling";
    SIGNALR_TRANSPORT_VALUE_SERVER_SENT_EVENTS = "server_sent_events";
    SIGNALR_TRANSPORT_VALUE_WEB_SOCKETS = "web_sockets";
    ATTR_TELEMETRY_SDK_LANGUAGE = "telemetry.sdk.language";
    TELEMETRY_SDK_LANGUAGE_VALUE_CPP = "cpp";
    TELEMETRY_SDK_LANGUAGE_VALUE_DOTNET = "dotnet";
    TELEMETRY_SDK_LANGUAGE_VALUE_ERLANG = "erlang";
    TELEMETRY_SDK_LANGUAGE_VALUE_GO = "go";
    TELEMETRY_SDK_LANGUAGE_VALUE_JAVA = "java";
    TELEMETRY_SDK_LANGUAGE_VALUE_NODEJS = "nodejs";
    TELEMETRY_SDK_LANGUAGE_VALUE_PHP = "php";
    TELEMETRY_SDK_LANGUAGE_VALUE_PYTHON = "python";
    TELEMETRY_SDK_LANGUAGE_VALUE_RUBY = "ruby";
    TELEMETRY_SDK_LANGUAGE_VALUE_RUST = "rust";
    TELEMETRY_SDK_LANGUAGE_VALUE_SWIFT = "swift";
    TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS = "webjs";
    ATTR_TELEMETRY_SDK_NAME = "telemetry.sdk.name";
    ATTR_TELEMETRY_SDK_VERSION = "telemetry.sdk.version";
    ATTR_URL_FRAGMENT = "url.fragment";
    ATTR_URL_FULL = "url.full";
    ATTR_URL_PATH = "url.path";
    ATTR_URL_QUERY = "url.query";
    ATTR_URL_SCHEME = "url.scheme";
    ATTR_USER_AGENT_ORIGINAL = "user_agent.original";
  }
});

// node_modules/@opentelemetry/semantic-conventions/build/esm/stable_metrics.js
var METRIC_ASPNETCORE_DIAGNOSTICS_EXCEPTIONS, METRIC_ASPNETCORE_RATE_LIMITING_ACTIVE_REQUEST_LEASES, METRIC_ASPNETCORE_RATE_LIMITING_QUEUED_REQUESTS, METRIC_ASPNETCORE_RATE_LIMITING_REQUEST_TIME_IN_QUEUE, METRIC_ASPNETCORE_RATE_LIMITING_REQUEST_LEASE_DURATION, METRIC_ASPNETCORE_RATE_LIMITING_REQUESTS, METRIC_ASPNETCORE_ROUTING_MATCH_ATTEMPTS, METRIC_DB_CLIENT_OPERATION_DURATION, METRIC_DOTNET_ASSEMBLY_COUNT, METRIC_DOTNET_EXCEPTIONS, METRIC_DOTNET_GC_COLLECTIONS, METRIC_DOTNET_GC_HEAP_TOTAL_ALLOCATED, METRIC_DOTNET_GC_LAST_COLLECTION_HEAP_FRAGMENTATION_SIZE, METRIC_DOTNET_GC_LAST_COLLECTION_HEAP_SIZE, METRIC_DOTNET_GC_LAST_COLLECTION_MEMORY_COMMITTED_SIZE, METRIC_DOTNET_GC_PAUSE_TIME, METRIC_DOTNET_JIT_COMPILATION_TIME, METRIC_DOTNET_JIT_COMPILED_IL_SIZE, METRIC_DOTNET_JIT_COMPILED_METHODS, METRIC_DOTNET_MONITOR_LOCK_CONTENTIONS, METRIC_DOTNET_PROCESS_CPU_COUNT, METRIC_DOTNET_PROCESS_CPU_TIME, METRIC_DOTNET_PROCESS_MEMORY_WORKING_SET, METRIC_DOTNET_THREAD_POOL_QUEUE_LENGTH, METRIC_DOTNET_THREAD_POOL_THREAD_COUNT, METRIC_DOTNET_THREAD_POOL_WORK_ITEM_COUNT, METRIC_DOTNET_TIMER_COUNT, METRIC_HTTP_CLIENT_REQUEST_DURATION, METRIC_HTTP_SERVER_REQUEST_DURATION, METRIC_JVM_CLASS_COUNT, METRIC_JVM_CLASS_LOADED, METRIC_JVM_CLASS_UNLOADED, METRIC_JVM_CPU_COUNT, METRIC_JVM_CPU_RECENT_UTILIZATION, METRIC_JVM_CPU_TIME, METRIC_JVM_GC_DURATION, METRIC_JVM_MEMORY_COMMITTED, METRIC_JVM_MEMORY_LIMIT, METRIC_JVM_MEMORY_USED, METRIC_JVM_MEMORY_USED_AFTER_LAST_GC, METRIC_JVM_THREAD_COUNT, METRIC_KESTREL_ACTIVE_CONNECTIONS, METRIC_KESTREL_ACTIVE_TLS_HANDSHAKES, METRIC_KESTREL_CONNECTION_DURATION, METRIC_KESTREL_QUEUED_CONNECTIONS, METRIC_KESTREL_QUEUED_REQUESTS, METRIC_KESTREL_REJECTED_CONNECTIONS, METRIC_KESTREL_TLS_HANDSHAKE_DURATION, METRIC_KESTREL_UPGRADED_CONNECTIONS, METRIC_SIGNALR_SERVER_ACTIVE_CONNECTIONS, METRIC_SIGNALR_SERVER_CONNECTION_DURATION;
var init_stable_metrics = __esm({
  "node_modules/@opentelemetry/semantic-conventions/build/esm/stable_metrics.js"() {
    METRIC_ASPNETCORE_DIAGNOSTICS_EXCEPTIONS = "aspnetcore.diagnostics.exceptions";
    METRIC_ASPNETCORE_RATE_LIMITING_ACTIVE_REQUEST_LEASES = "aspnetcore.rate_limiting.active_request_leases";
    METRIC_ASPNETCORE_RATE_LIMITING_QUEUED_REQUESTS = "aspnetcore.rate_limiting.queued_requests";
    METRIC_ASPNETCORE_RATE_LIMITING_REQUEST_TIME_IN_QUEUE = "aspnetcore.rate_limiting.request.time_in_queue";
    METRIC_ASPNETCORE_RATE_LIMITING_REQUEST_LEASE_DURATION = "aspnetcore.rate_limiting.request_lease.duration";
    METRIC_ASPNETCORE_RATE_LIMITING_REQUESTS = "aspnetcore.rate_limiting.requests";
    METRIC_ASPNETCORE_ROUTING_MATCH_ATTEMPTS = "aspnetcore.routing.match_attempts";
    METRIC_DB_CLIENT_OPERATION_DURATION = "db.client.operation.duration";
    METRIC_DOTNET_ASSEMBLY_COUNT = "dotnet.assembly.count";
    METRIC_DOTNET_EXCEPTIONS = "dotnet.exceptions";
    METRIC_DOTNET_GC_COLLECTIONS = "dotnet.gc.collections";
    METRIC_DOTNET_GC_HEAP_TOTAL_ALLOCATED = "dotnet.gc.heap.total_allocated";
    METRIC_DOTNET_GC_LAST_COLLECTION_HEAP_FRAGMENTATION_SIZE = "dotnet.gc.last_collection.heap.fragmentation.size";
    METRIC_DOTNET_GC_LAST_COLLECTION_HEAP_SIZE = "dotnet.gc.last_collection.heap.size";
    METRIC_DOTNET_GC_LAST_COLLECTION_MEMORY_COMMITTED_SIZE = "dotnet.gc.last_collection.memory.committed_size";
    METRIC_DOTNET_GC_PAUSE_TIME = "dotnet.gc.pause.time";
    METRIC_DOTNET_JIT_COMPILATION_TIME = "dotnet.jit.compilation.time";
    METRIC_DOTNET_JIT_COMPILED_IL_SIZE = "dotnet.jit.compiled_il.size";
    METRIC_DOTNET_JIT_COMPILED_METHODS = "dotnet.jit.compiled_methods";
    METRIC_DOTNET_MONITOR_LOCK_CONTENTIONS = "dotnet.monitor.lock_contentions";
    METRIC_DOTNET_PROCESS_CPU_COUNT = "dotnet.process.cpu.count";
    METRIC_DOTNET_PROCESS_CPU_TIME = "dotnet.process.cpu.time";
    METRIC_DOTNET_PROCESS_MEMORY_WORKING_SET = "dotnet.process.memory.working_set";
    METRIC_DOTNET_THREAD_POOL_QUEUE_LENGTH = "dotnet.thread_pool.queue.length";
    METRIC_DOTNET_THREAD_POOL_THREAD_COUNT = "dotnet.thread_pool.thread.count";
    METRIC_DOTNET_THREAD_POOL_WORK_ITEM_COUNT = "dotnet.thread_pool.work_item.count";
    METRIC_DOTNET_TIMER_COUNT = "dotnet.timer.count";
    METRIC_HTTP_CLIENT_REQUEST_DURATION = "http.client.request.duration";
    METRIC_HTTP_SERVER_REQUEST_DURATION = "http.server.request.duration";
    METRIC_JVM_CLASS_COUNT = "jvm.class.count";
    METRIC_JVM_CLASS_LOADED = "jvm.class.loaded";
    METRIC_JVM_CLASS_UNLOADED = "jvm.class.unloaded";
    METRIC_JVM_CPU_COUNT = "jvm.cpu.count";
    METRIC_JVM_CPU_RECENT_UTILIZATION = "jvm.cpu.recent_utilization";
    METRIC_JVM_CPU_TIME = "jvm.cpu.time";
    METRIC_JVM_GC_DURATION = "jvm.gc.duration";
    METRIC_JVM_MEMORY_COMMITTED = "jvm.memory.committed";
    METRIC_JVM_MEMORY_LIMIT = "jvm.memory.limit";
    METRIC_JVM_MEMORY_USED = "jvm.memory.used";
    METRIC_JVM_MEMORY_USED_AFTER_LAST_GC = "jvm.memory.used_after_last_gc";
    METRIC_JVM_THREAD_COUNT = "jvm.thread.count";
    METRIC_KESTREL_ACTIVE_CONNECTIONS = "kestrel.active_connections";
    METRIC_KESTREL_ACTIVE_TLS_HANDSHAKES = "kestrel.active_tls_handshakes";
    METRIC_KESTREL_CONNECTION_DURATION = "kestrel.connection.duration";
    METRIC_KESTREL_QUEUED_CONNECTIONS = "kestrel.queued_connections";
    METRIC_KESTREL_QUEUED_REQUESTS = "kestrel.queued_requests";
    METRIC_KESTREL_REJECTED_CONNECTIONS = "kestrel.rejected_connections";
    METRIC_KESTREL_TLS_HANDSHAKE_DURATION = "kestrel.tls_handshake.duration";
    METRIC_KESTREL_UPGRADED_CONNECTIONS = "kestrel.upgraded_connections";
    METRIC_SIGNALR_SERVER_ACTIVE_CONNECTIONS = "signalr.server.active_connections";
    METRIC_SIGNALR_SERVER_CONNECTION_DURATION = "signalr.server.connection.duration";
  }
});

// node_modules/@opentelemetry/semantic-conventions/build/esm/stable_events.js
var EVENT_EXCEPTION;
var init_stable_events = __esm({
  "node_modules/@opentelemetry/semantic-conventions/build/esm/stable_events.js"() {
    EVENT_EXCEPTION = "exception";
  }
});

// node_modules/@opentelemetry/semantic-conventions/build/esm/index.js
var esm_exports2 = {};
__export(esm_exports2, {
  ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_ABORTED: () => ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_ABORTED,
  ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_HANDLED: () => ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_HANDLED,
  ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_SKIPPED: () => ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_SKIPPED,
  ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_UNHANDLED: () => ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT_VALUE_UNHANDLED,
  ASPNETCORE_RATE_LIMITING_RESULT_VALUE_ACQUIRED: () => ASPNETCORE_RATE_LIMITING_RESULT_VALUE_ACQUIRED,
  ASPNETCORE_RATE_LIMITING_RESULT_VALUE_ENDPOINT_LIMITER: () => ASPNETCORE_RATE_LIMITING_RESULT_VALUE_ENDPOINT_LIMITER,
  ASPNETCORE_RATE_LIMITING_RESULT_VALUE_GLOBAL_LIMITER: () => ASPNETCORE_RATE_LIMITING_RESULT_VALUE_GLOBAL_LIMITER,
  ASPNETCORE_RATE_LIMITING_RESULT_VALUE_REQUEST_CANCELED: () => ASPNETCORE_RATE_LIMITING_RESULT_VALUE_REQUEST_CANCELED,
  ASPNETCORE_ROUTING_MATCH_STATUS_VALUE_FAILURE: () => ASPNETCORE_ROUTING_MATCH_STATUS_VALUE_FAILURE,
  ASPNETCORE_ROUTING_MATCH_STATUS_VALUE_SUCCESS: () => ASPNETCORE_ROUTING_MATCH_STATUS_VALUE_SUCCESS,
  ATTR_ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT: () => ATTR_ASPNETCORE_DIAGNOSTICS_EXCEPTION_RESULT,
  ATTR_ASPNETCORE_DIAGNOSTICS_HANDLER_TYPE: () => ATTR_ASPNETCORE_DIAGNOSTICS_HANDLER_TYPE,
  ATTR_ASPNETCORE_RATE_LIMITING_POLICY: () => ATTR_ASPNETCORE_RATE_LIMITING_POLICY,
  ATTR_ASPNETCORE_RATE_LIMITING_RESULT: () => ATTR_ASPNETCORE_RATE_LIMITING_RESULT,
  ATTR_ASPNETCORE_REQUEST_IS_UNHANDLED: () => ATTR_ASPNETCORE_REQUEST_IS_UNHANDLED,
  ATTR_ASPNETCORE_ROUTING_IS_FALLBACK: () => ATTR_ASPNETCORE_ROUTING_IS_FALLBACK,
  ATTR_ASPNETCORE_ROUTING_MATCH_STATUS: () => ATTR_ASPNETCORE_ROUTING_MATCH_STATUS,
  ATTR_ASPNETCORE_USER_IS_AUTHENTICATED: () => ATTR_ASPNETCORE_USER_IS_AUTHENTICATED,
  ATTR_CLIENT_ADDRESS: () => ATTR_CLIENT_ADDRESS,
  ATTR_CLIENT_PORT: () => ATTR_CLIENT_PORT,
  ATTR_CODE_COLUMN_NUMBER: () => ATTR_CODE_COLUMN_NUMBER,
  ATTR_CODE_FILE_PATH: () => ATTR_CODE_FILE_PATH,
  ATTR_CODE_FUNCTION_NAME: () => ATTR_CODE_FUNCTION_NAME,
  ATTR_CODE_LINE_NUMBER: () => ATTR_CODE_LINE_NUMBER,
  ATTR_CODE_STACKTRACE: () => ATTR_CODE_STACKTRACE,
  ATTR_DB_COLLECTION_NAME: () => ATTR_DB_COLLECTION_NAME,
  ATTR_DB_NAMESPACE: () => ATTR_DB_NAMESPACE,
  ATTR_DB_OPERATION_BATCH_SIZE: () => ATTR_DB_OPERATION_BATCH_SIZE,
  ATTR_DB_OPERATION_NAME: () => ATTR_DB_OPERATION_NAME,
  ATTR_DB_QUERY_SUMMARY: () => ATTR_DB_QUERY_SUMMARY,
  ATTR_DB_QUERY_TEXT: () => ATTR_DB_QUERY_TEXT,
  ATTR_DB_RESPONSE_STATUS_CODE: () => ATTR_DB_RESPONSE_STATUS_CODE,
  ATTR_DB_STORED_PROCEDURE_NAME: () => ATTR_DB_STORED_PROCEDURE_NAME,
  ATTR_DB_SYSTEM_NAME: () => ATTR_DB_SYSTEM_NAME,
  ATTR_DOTNET_GC_HEAP_GENERATION: () => ATTR_DOTNET_GC_HEAP_GENERATION,
  ATTR_ERROR_TYPE: () => ATTR_ERROR_TYPE,
  ATTR_EXCEPTION_ESCAPED: () => ATTR_EXCEPTION_ESCAPED,
  ATTR_EXCEPTION_MESSAGE: () => ATTR_EXCEPTION_MESSAGE,
  ATTR_EXCEPTION_STACKTRACE: () => ATTR_EXCEPTION_STACKTRACE,
  ATTR_EXCEPTION_TYPE: () => ATTR_EXCEPTION_TYPE,
  ATTR_HTTP_REQUEST_HEADER: () => ATTR_HTTP_REQUEST_HEADER,
  ATTR_HTTP_REQUEST_METHOD: () => ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_REQUEST_METHOD_ORIGINAL: () => ATTR_HTTP_REQUEST_METHOD_ORIGINAL,
  ATTR_HTTP_REQUEST_RESEND_COUNT: () => ATTR_HTTP_REQUEST_RESEND_COUNT,
  ATTR_HTTP_RESPONSE_HEADER: () => ATTR_HTTP_RESPONSE_HEADER,
  ATTR_HTTP_RESPONSE_STATUS_CODE: () => ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE: () => ATTR_HTTP_ROUTE,
  ATTR_JVM_GC_ACTION: () => ATTR_JVM_GC_ACTION,
  ATTR_JVM_GC_NAME: () => ATTR_JVM_GC_NAME,
  ATTR_JVM_MEMORY_POOL_NAME: () => ATTR_JVM_MEMORY_POOL_NAME,
  ATTR_JVM_MEMORY_TYPE: () => ATTR_JVM_MEMORY_TYPE,
  ATTR_JVM_THREAD_DAEMON: () => ATTR_JVM_THREAD_DAEMON,
  ATTR_JVM_THREAD_STATE: () => ATTR_JVM_THREAD_STATE,
  ATTR_NETWORK_LOCAL_ADDRESS: () => ATTR_NETWORK_LOCAL_ADDRESS,
  ATTR_NETWORK_LOCAL_PORT: () => ATTR_NETWORK_LOCAL_PORT,
  ATTR_NETWORK_PEER_ADDRESS: () => ATTR_NETWORK_PEER_ADDRESS,
  ATTR_NETWORK_PEER_PORT: () => ATTR_NETWORK_PEER_PORT,
  ATTR_NETWORK_PROTOCOL_NAME: () => ATTR_NETWORK_PROTOCOL_NAME,
  ATTR_NETWORK_PROTOCOL_VERSION: () => ATTR_NETWORK_PROTOCOL_VERSION,
  ATTR_NETWORK_TRANSPORT: () => ATTR_NETWORK_TRANSPORT,
  ATTR_NETWORK_TYPE: () => ATTR_NETWORK_TYPE,
  ATTR_OTEL_SCOPE_NAME: () => ATTR_OTEL_SCOPE_NAME,
  ATTR_OTEL_SCOPE_VERSION: () => ATTR_OTEL_SCOPE_VERSION,
  ATTR_OTEL_STATUS_CODE: () => ATTR_OTEL_STATUS_CODE,
  ATTR_OTEL_STATUS_DESCRIPTION: () => ATTR_OTEL_STATUS_DESCRIPTION,
  ATTR_SERVER_ADDRESS: () => ATTR_SERVER_ADDRESS,
  ATTR_SERVER_PORT: () => ATTR_SERVER_PORT,
  ATTR_SERVICE_NAME: () => ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION: () => ATTR_SERVICE_VERSION,
  ATTR_SIGNALR_CONNECTION_STATUS: () => ATTR_SIGNALR_CONNECTION_STATUS,
  ATTR_SIGNALR_TRANSPORT: () => ATTR_SIGNALR_TRANSPORT,
  ATTR_TELEMETRY_SDK_LANGUAGE: () => ATTR_TELEMETRY_SDK_LANGUAGE,
  ATTR_TELEMETRY_SDK_NAME: () => ATTR_TELEMETRY_SDK_NAME,
  ATTR_TELEMETRY_SDK_VERSION: () => ATTR_TELEMETRY_SDK_VERSION,
  ATTR_URL_FRAGMENT: () => ATTR_URL_FRAGMENT,
  ATTR_URL_FULL: () => ATTR_URL_FULL,
  ATTR_URL_PATH: () => ATTR_URL_PATH,
  ATTR_URL_QUERY: () => ATTR_URL_QUERY,
  ATTR_URL_SCHEME: () => ATTR_URL_SCHEME,
  ATTR_USER_AGENT_ORIGINAL: () => ATTR_USER_AGENT_ORIGINAL,
  AWSECSLAUNCHTYPEVALUES_EC2: () => AWSECSLAUNCHTYPEVALUES_EC2,
  AWSECSLAUNCHTYPEVALUES_FARGATE: () => AWSECSLAUNCHTYPEVALUES_FARGATE,
  AwsEcsLaunchtypeValues: () => AwsEcsLaunchtypeValues,
  CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS: () => CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS,
  CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC: () => CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC,
  CLOUDPLATFORMVALUES_AWS_EC2: () => CLOUDPLATFORMVALUES_AWS_EC2,
  CLOUDPLATFORMVALUES_AWS_ECS: () => CLOUDPLATFORMVALUES_AWS_ECS,
  CLOUDPLATFORMVALUES_AWS_EKS: () => CLOUDPLATFORMVALUES_AWS_EKS,
  CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK: () => CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK,
  CLOUDPLATFORMVALUES_AWS_LAMBDA: () => CLOUDPLATFORMVALUES_AWS_LAMBDA,
  CLOUDPLATFORMVALUES_AZURE_AKS: () => CLOUDPLATFORMVALUES_AZURE_AKS,
  CLOUDPLATFORMVALUES_AZURE_APP_SERVICE: () => CLOUDPLATFORMVALUES_AZURE_APP_SERVICE,
  CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES: () => CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES,
  CLOUDPLATFORMVALUES_AZURE_FUNCTIONS: () => CLOUDPLATFORMVALUES_AZURE_FUNCTIONS,
  CLOUDPLATFORMVALUES_AZURE_VM: () => CLOUDPLATFORMVALUES_AZURE_VM,
  CLOUDPLATFORMVALUES_GCP_APP_ENGINE: () => CLOUDPLATFORMVALUES_GCP_APP_ENGINE,
  CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS: () => CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS,
  CLOUDPLATFORMVALUES_GCP_CLOUD_RUN: () => CLOUDPLATFORMVALUES_GCP_CLOUD_RUN,
  CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE: () => CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE,
  CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE: () => CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE,
  CLOUDPROVIDERVALUES_ALIBABA_CLOUD: () => CLOUDPROVIDERVALUES_ALIBABA_CLOUD,
  CLOUDPROVIDERVALUES_AWS: () => CLOUDPROVIDERVALUES_AWS,
  CLOUDPROVIDERVALUES_AZURE: () => CLOUDPROVIDERVALUES_AZURE,
  CLOUDPROVIDERVALUES_GCP: () => CLOUDPROVIDERVALUES_GCP,
  CloudPlatformValues: () => CloudPlatformValues,
  CloudProviderValues: () => CloudProviderValues,
  DBCASSANDRACONSISTENCYLEVELVALUES_ALL: () => DBCASSANDRACONSISTENCYLEVELVALUES_ALL,
  DBCASSANDRACONSISTENCYLEVELVALUES_ANY: () => DBCASSANDRACONSISTENCYLEVELVALUES_ANY,
  DBCASSANDRACONSISTENCYLEVELVALUES_EACH_QUORUM: () => DBCASSANDRACONSISTENCYLEVELVALUES_EACH_QUORUM,
  DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_ONE: () => DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_ONE,
  DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_QUORUM: () => DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_QUORUM,
  DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_SERIAL: () => DBCASSANDRACONSISTENCYLEVELVALUES_LOCAL_SERIAL,
  DBCASSANDRACONSISTENCYLEVELVALUES_ONE: () => DBCASSANDRACONSISTENCYLEVELVALUES_ONE,
  DBCASSANDRACONSISTENCYLEVELVALUES_QUORUM: () => DBCASSANDRACONSISTENCYLEVELVALUES_QUORUM,
  DBCASSANDRACONSISTENCYLEVELVALUES_SERIAL: () => DBCASSANDRACONSISTENCYLEVELVALUES_SERIAL,
  DBCASSANDRACONSISTENCYLEVELVALUES_THREE: () => DBCASSANDRACONSISTENCYLEVELVALUES_THREE,
  DBCASSANDRACONSISTENCYLEVELVALUES_TWO: () => DBCASSANDRACONSISTENCYLEVELVALUES_TWO,
  DBSYSTEMVALUES_ADABAS: () => DBSYSTEMVALUES_ADABAS,
  DBSYSTEMVALUES_CACHE: () => DBSYSTEMVALUES_CACHE,
  DBSYSTEMVALUES_CASSANDRA: () => DBSYSTEMVALUES_CASSANDRA,
  DBSYSTEMVALUES_CLOUDSCAPE: () => DBSYSTEMVALUES_CLOUDSCAPE,
  DBSYSTEMVALUES_COCKROACHDB: () => DBSYSTEMVALUES_COCKROACHDB,
  DBSYSTEMVALUES_COLDFUSION: () => DBSYSTEMVALUES_COLDFUSION,
  DBSYSTEMVALUES_COSMOSDB: () => DBSYSTEMVALUES_COSMOSDB,
  DBSYSTEMVALUES_COUCHBASE: () => DBSYSTEMVALUES_COUCHBASE,
  DBSYSTEMVALUES_COUCHDB: () => DBSYSTEMVALUES_COUCHDB,
  DBSYSTEMVALUES_DB2: () => DBSYSTEMVALUES_DB2,
  DBSYSTEMVALUES_DERBY: () => DBSYSTEMVALUES_DERBY,
  DBSYSTEMVALUES_DYNAMODB: () => DBSYSTEMVALUES_DYNAMODB,
  DBSYSTEMVALUES_EDB: () => DBSYSTEMVALUES_EDB,
  DBSYSTEMVALUES_ELASTICSEARCH: () => DBSYSTEMVALUES_ELASTICSEARCH,
  DBSYSTEMVALUES_FILEMAKER: () => DBSYSTEMVALUES_FILEMAKER,
  DBSYSTEMVALUES_FIREBIRD: () => DBSYSTEMVALUES_FIREBIRD,
  DBSYSTEMVALUES_FIRSTSQL: () => DBSYSTEMVALUES_FIRSTSQL,
  DBSYSTEMVALUES_GEODE: () => DBSYSTEMVALUES_GEODE,
  DBSYSTEMVALUES_H2: () => DBSYSTEMVALUES_H2,
  DBSYSTEMVALUES_HANADB: () => DBSYSTEMVALUES_HANADB,
  DBSYSTEMVALUES_HBASE: () => DBSYSTEMVALUES_HBASE,
  DBSYSTEMVALUES_HIVE: () => DBSYSTEMVALUES_HIVE,
  DBSYSTEMVALUES_HSQLDB: () => DBSYSTEMVALUES_HSQLDB,
  DBSYSTEMVALUES_INFORMIX: () => DBSYSTEMVALUES_INFORMIX,
  DBSYSTEMVALUES_INGRES: () => DBSYSTEMVALUES_INGRES,
  DBSYSTEMVALUES_INSTANTDB: () => DBSYSTEMVALUES_INSTANTDB,
  DBSYSTEMVALUES_INTERBASE: () => DBSYSTEMVALUES_INTERBASE,
  DBSYSTEMVALUES_MARIADB: () => DBSYSTEMVALUES_MARIADB,
  DBSYSTEMVALUES_MAXDB: () => DBSYSTEMVALUES_MAXDB,
  DBSYSTEMVALUES_MEMCACHED: () => DBSYSTEMVALUES_MEMCACHED,
  DBSYSTEMVALUES_MONGODB: () => DBSYSTEMVALUES_MONGODB,
  DBSYSTEMVALUES_MSSQL: () => DBSYSTEMVALUES_MSSQL,
  DBSYSTEMVALUES_MYSQL: () => DBSYSTEMVALUES_MYSQL,
  DBSYSTEMVALUES_NEO4J: () => DBSYSTEMVALUES_NEO4J,
  DBSYSTEMVALUES_NETEZZA: () => DBSYSTEMVALUES_NETEZZA,
  DBSYSTEMVALUES_ORACLE: () => DBSYSTEMVALUES_ORACLE,
  DBSYSTEMVALUES_OTHER_SQL: () => DBSYSTEMVALUES_OTHER_SQL,
  DBSYSTEMVALUES_PERVASIVE: () => DBSYSTEMVALUES_PERVASIVE,
  DBSYSTEMVALUES_POINTBASE: () => DBSYSTEMVALUES_POINTBASE,
  DBSYSTEMVALUES_POSTGRESQL: () => DBSYSTEMVALUES_POSTGRESQL,
  DBSYSTEMVALUES_PROGRESS: () => DBSYSTEMVALUES_PROGRESS,
  DBSYSTEMVALUES_REDIS: () => DBSYSTEMVALUES_REDIS,
  DBSYSTEMVALUES_REDSHIFT: () => DBSYSTEMVALUES_REDSHIFT,
  DBSYSTEMVALUES_SQLITE: () => DBSYSTEMVALUES_SQLITE,
  DBSYSTEMVALUES_SYBASE: () => DBSYSTEMVALUES_SYBASE,
  DBSYSTEMVALUES_TERADATA: () => DBSYSTEMVALUES_TERADATA,
  DBSYSTEMVALUES_VERTICA: () => DBSYSTEMVALUES_VERTICA,
  DB_SYSTEM_NAME_VALUE_MARIADB: () => DB_SYSTEM_NAME_VALUE_MARIADB,
  DB_SYSTEM_NAME_VALUE_MICROSOFT_SQL_SERVER: () => DB_SYSTEM_NAME_VALUE_MICROSOFT_SQL_SERVER,
  DB_SYSTEM_NAME_VALUE_MYSQL: () => DB_SYSTEM_NAME_VALUE_MYSQL,
  DB_SYSTEM_NAME_VALUE_POSTGRESQL: () => DB_SYSTEM_NAME_VALUE_POSTGRESQL,
  DOTNET_GC_HEAP_GENERATION_VALUE_GEN0: () => DOTNET_GC_HEAP_GENERATION_VALUE_GEN0,
  DOTNET_GC_HEAP_GENERATION_VALUE_GEN1: () => DOTNET_GC_HEAP_GENERATION_VALUE_GEN1,
  DOTNET_GC_HEAP_GENERATION_VALUE_GEN2: () => DOTNET_GC_HEAP_GENERATION_VALUE_GEN2,
  DOTNET_GC_HEAP_GENERATION_VALUE_LOH: () => DOTNET_GC_HEAP_GENERATION_VALUE_LOH,
  DOTNET_GC_HEAP_GENERATION_VALUE_POH: () => DOTNET_GC_HEAP_GENERATION_VALUE_POH,
  DbCassandraConsistencyLevelValues: () => DbCassandraConsistencyLevelValues,
  DbSystemValues: () => DbSystemValues,
  ERROR_TYPE_VALUE_OTHER: () => ERROR_TYPE_VALUE_OTHER,
  EVENT_EXCEPTION: () => EVENT_EXCEPTION,
  FAASDOCUMENTOPERATIONVALUES_DELETE: () => FAASDOCUMENTOPERATIONVALUES_DELETE,
  FAASDOCUMENTOPERATIONVALUES_EDIT: () => FAASDOCUMENTOPERATIONVALUES_EDIT,
  FAASDOCUMENTOPERATIONVALUES_INSERT: () => FAASDOCUMENTOPERATIONVALUES_INSERT,
  FAASINVOKEDPROVIDERVALUES_ALIBABA_CLOUD: () => FAASINVOKEDPROVIDERVALUES_ALIBABA_CLOUD,
  FAASINVOKEDPROVIDERVALUES_AWS: () => FAASINVOKEDPROVIDERVALUES_AWS,
  FAASINVOKEDPROVIDERVALUES_AZURE: () => FAASINVOKEDPROVIDERVALUES_AZURE,
  FAASINVOKEDPROVIDERVALUES_GCP: () => FAASINVOKEDPROVIDERVALUES_GCP,
  FAASTRIGGERVALUES_DATASOURCE: () => FAASTRIGGERVALUES_DATASOURCE,
  FAASTRIGGERVALUES_HTTP: () => FAASTRIGGERVALUES_HTTP,
  FAASTRIGGERVALUES_OTHER: () => FAASTRIGGERVALUES_OTHER,
  FAASTRIGGERVALUES_PUBSUB: () => FAASTRIGGERVALUES_PUBSUB,
  FAASTRIGGERVALUES_TIMER: () => FAASTRIGGERVALUES_TIMER,
  FaasDocumentOperationValues: () => FaasDocumentOperationValues,
  FaasInvokedProviderValues: () => FaasInvokedProviderValues,
  FaasTriggerValues: () => FaasTriggerValues,
  HOSTARCHVALUES_AMD64: () => HOSTARCHVALUES_AMD64,
  HOSTARCHVALUES_ARM32: () => HOSTARCHVALUES_ARM32,
  HOSTARCHVALUES_ARM64: () => HOSTARCHVALUES_ARM64,
  HOSTARCHVALUES_IA64: () => HOSTARCHVALUES_IA64,
  HOSTARCHVALUES_PPC32: () => HOSTARCHVALUES_PPC32,
  HOSTARCHVALUES_PPC64: () => HOSTARCHVALUES_PPC64,
  HOSTARCHVALUES_X86: () => HOSTARCHVALUES_X86,
  HTTPFLAVORVALUES_HTTP_1_0: () => HTTPFLAVORVALUES_HTTP_1_0,
  HTTPFLAVORVALUES_HTTP_1_1: () => HTTPFLAVORVALUES_HTTP_1_1,
  HTTPFLAVORVALUES_HTTP_2_0: () => HTTPFLAVORVALUES_HTTP_2_0,
  HTTPFLAVORVALUES_QUIC: () => HTTPFLAVORVALUES_QUIC,
  HTTPFLAVORVALUES_SPDY: () => HTTPFLAVORVALUES_SPDY,
  HTTP_REQUEST_METHOD_VALUE_CONNECT: () => HTTP_REQUEST_METHOD_VALUE_CONNECT,
  HTTP_REQUEST_METHOD_VALUE_DELETE: () => HTTP_REQUEST_METHOD_VALUE_DELETE,
  HTTP_REQUEST_METHOD_VALUE_GET: () => HTTP_REQUEST_METHOD_VALUE_GET,
  HTTP_REQUEST_METHOD_VALUE_HEAD: () => HTTP_REQUEST_METHOD_VALUE_HEAD,
  HTTP_REQUEST_METHOD_VALUE_OPTIONS: () => HTTP_REQUEST_METHOD_VALUE_OPTIONS,
  HTTP_REQUEST_METHOD_VALUE_OTHER: () => HTTP_REQUEST_METHOD_VALUE_OTHER,
  HTTP_REQUEST_METHOD_VALUE_PATCH: () => HTTP_REQUEST_METHOD_VALUE_PATCH,
  HTTP_REQUEST_METHOD_VALUE_POST: () => HTTP_REQUEST_METHOD_VALUE_POST,
  HTTP_REQUEST_METHOD_VALUE_PUT: () => HTTP_REQUEST_METHOD_VALUE_PUT,
  HTTP_REQUEST_METHOD_VALUE_TRACE: () => HTTP_REQUEST_METHOD_VALUE_TRACE,
  HostArchValues: () => HostArchValues,
  HttpFlavorValues: () => HttpFlavorValues,
  JVM_MEMORY_TYPE_VALUE_HEAP: () => JVM_MEMORY_TYPE_VALUE_HEAP,
  JVM_MEMORY_TYPE_VALUE_NON_HEAP: () => JVM_MEMORY_TYPE_VALUE_NON_HEAP,
  JVM_THREAD_STATE_VALUE_BLOCKED: () => JVM_THREAD_STATE_VALUE_BLOCKED,
  JVM_THREAD_STATE_VALUE_NEW: () => JVM_THREAD_STATE_VALUE_NEW,
  JVM_THREAD_STATE_VALUE_RUNNABLE: () => JVM_THREAD_STATE_VALUE_RUNNABLE,
  JVM_THREAD_STATE_VALUE_TERMINATED: () => JVM_THREAD_STATE_VALUE_TERMINATED,
  JVM_THREAD_STATE_VALUE_TIMED_WAITING: () => JVM_THREAD_STATE_VALUE_TIMED_WAITING,
  JVM_THREAD_STATE_VALUE_WAITING: () => JVM_THREAD_STATE_VALUE_WAITING,
  MESSAGETYPEVALUES_RECEIVED: () => MESSAGETYPEVALUES_RECEIVED,
  MESSAGETYPEVALUES_SENT: () => MESSAGETYPEVALUES_SENT,
  MESSAGINGDESTINATIONKINDVALUES_QUEUE: () => MESSAGINGDESTINATIONKINDVALUES_QUEUE,
  MESSAGINGDESTINATIONKINDVALUES_TOPIC: () => MESSAGINGDESTINATIONKINDVALUES_TOPIC,
  MESSAGINGOPERATIONVALUES_PROCESS: () => MESSAGINGOPERATIONVALUES_PROCESS,
  MESSAGINGOPERATIONVALUES_RECEIVE: () => MESSAGINGOPERATIONVALUES_RECEIVE,
  METRIC_ASPNETCORE_DIAGNOSTICS_EXCEPTIONS: () => METRIC_ASPNETCORE_DIAGNOSTICS_EXCEPTIONS,
  METRIC_ASPNETCORE_RATE_LIMITING_ACTIVE_REQUEST_LEASES: () => METRIC_ASPNETCORE_RATE_LIMITING_ACTIVE_REQUEST_LEASES,
  METRIC_ASPNETCORE_RATE_LIMITING_QUEUED_REQUESTS: () => METRIC_ASPNETCORE_RATE_LIMITING_QUEUED_REQUESTS,
  METRIC_ASPNETCORE_RATE_LIMITING_REQUESTS: () => METRIC_ASPNETCORE_RATE_LIMITING_REQUESTS,
  METRIC_ASPNETCORE_RATE_LIMITING_REQUEST_LEASE_DURATION: () => METRIC_ASPNETCORE_RATE_LIMITING_REQUEST_LEASE_DURATION,
  METRIC_ASPNETCORE_RATE_LIMITING_REQUEST_TIME_IN_QUEUE: () => METRIC_ASPNETCORE_RATE_LIMITING_REQUEST_TIME_IN_QUEUE,
  METRIC_ASPNETCORE_ROUTING_MATCH_ATTEMPTS: () => METRIC_ASPNETCORE_ROUTING_MATCH_ATTEMPTS,
  METRIC_DB_CLIENT_OPERATION_DURATION: () => METRIC_DB_CLIENT_OPERATION_DURATION,
  METRIC_DOTNET_ASSEMBLY_COUNT: () => METRIC_DOTNET_ASSEMBLY_COUNT,
  METRIC_DOTNET_EXCEPTIONS: () => METRIC_DOTNET_EXCEPTIONS,
  METRIC_DOTNET_GC_COLLECTIONS: () => METRIC_DOTNET_GC_COLLECTIONS,
  METRIC_DOTNET_GC_HEAP_TOTAL_ALLOCATED: () => METRIC_DOTNET_GC_HEAP_TOTAL_ALLOCATED,
  METRIC_DOTNET_GC_LAST_COLLECTION_HEAP_FRAGMENTATION_SIZE: () => METRIC_DOTNET_GC_LAST_COLLECTION_HEAP_FRAGMENTATION_SIZE,
  METRIC_DOTNET_GC_LAST_COLLECTION_HEAP_SIZE: () => METRIC_DOTNET_GC_LAST_COLLECTION_HEAP_SIZE,
  METRIC_DOTNET_GC_LAST_COLLECTION_MEMORY_COMMITTED_SIZE: () => METRIC_DOTNET_GC_LAST_COLLECTION_MEMORY_COMMITTED_SIZE,
  METRIC_DOTNET_GC_PAUSE_TIME: () => METRIC_DOTNET_GC_PAUSE_TIME,
  METRIC_DOTNET_JIT_COMPILATION_TIME: () => METRIC_DOTNET_JIT_COMPILATION_TIME,
  METRIC_DOTNET_JIT_COMPILED_IL_SIZE: () => METRIC_DOTNET_JIT_COMPILED_IL_SIZE,
  METRIC_DOTNET_JIT_COMPILED_METHODS: () => METRIC_DOTNET_JIT_COMPILED_METHODS,
  METRIC_DOTNET_MONITOR_LOCK_CONTENTIONS: () => METRIC_DOTNET_MONITOR_LOCK_CONTENTIONS,
  METRIC_DOTNET_PROCESS_CPU_COUNT: () => METRIC_DOTNET_PROCESS_CPU_COUNT,
  METRIC_DOTNET_PROCESS_CPU_TIME: () => METRIC_DOTNET_PROCESS_CPU_TIME,
  METRIC_DOTNET_PROCESS_MEMORY_WORKING_SET: () => METRIC_DOTNET_PROCESS_MEMORY_WORKING_SET,
  METRIC_DOTNET_THREAD_POOL_QUEUE_LENGTH: () => METRIC_DOTNET_THREAD_POOL_QUEUE_LENGTH,
  METRIC_DOTNET_THREAD_POOL_THREAD_COUNT: () => METRIC_DOTNET_THREAD_POOL_THREAD_COUNT,
  METRIC_DOTNET_THREAD_POOL_WORK_ITEM_COUNT: () => METRIC_DOTNET_THREAD_POOL_WORK_ITEM_COUNT,
  METRIC_DOTNET_TIMER_COUNT: () => METRIC_DOTNET_TIMER_COUNT,
  METRIC_HTTP_CLIENT_REQUEST_DURATION: () => METRIC_HTTP_CLIENT_REQUEST_DURATION,
  METRIC_HTTP_SERVER_REQUEST_DURATION: () => METRIC_HTTP_SERVER_REQUEST_DURATION,
  METRIC_JVM_CLASS_COUNT: () => METRIC_JVM_CLASS_COUNT,
  METRIC_JVM_CLASS_LOADED: () => METRIC_JVM_CLASS_LOADED,
  METRIC_JVM_CLASS_UNLOADED: () => METRIC_JVM_CLASS_UNLOADED,
  METRIC_JVM_CPU_COUNT: () => METRIC_JVM_CPU_COUNT,
  METRIC_JVM_CPU_RECENT_UTILIZATION: () => METRIC_JVM_CPU_RECENT_UTILIZATION,
  METRIC_JVM_CPU_TIME: () => METRIC_JVM_CPU_TIME,
  METRIC_JVM_GC_DURATION: () => METRIC_JVM_GC_DURATION,
  METRIC_JVM_MEMORY_COMMITTED: () => METRIC_JVM_MEMORY_COMMITTED,
  METRIC_JVM_MEMORY_LIMIT: () => METRIC_JVM_MEMORY_LIMIT,
  METRIC_JVM_MEMORY_USED: () => METRIC_JVM_MEMORY_USED,
  METRIC_JVM_MEMORY_USED_AFTER_LAST_GC: () => METRIC_JVM_MEMORY_USED_AFTER_LAST_GC,
  METRIC_JVM_THREAD_COUNT: () => METRIC_JVM_THREAD_COUNT,
  METRIC_KESTREL_ACTIVE_CONNECTIONS: () => METRIC_KESTREL_ACTIVE_CONNECTIONS,
  METRIC_KESTREL_ACTIVE_TLS_HANDSHAKES: () => METRIC_KESTREL_ACTIVE_TLS_HANDSHAKES,
  METRIC_KESTREL_CONNECTION_DURATION: () => METRIC_KESTREL_CONNECTION_DURATION,
  METRIC_KESTREL_QUEUED_CONNECTIONS: () => METRIC_KESTREL_QUEUED_CONNECTIONS,
  METRIC_KESTREL_QUEUED_REQUESTS: () => METRIC_KESTREL_QUEUED_REQUESTS,
  METRIC_KESTREL_REJECTED_CONNECTIONS: () => METRIC_KESTREL_REJECTED_CONNECTIONS,
  METRIC_KESTREL_TLS_HANDSHAKE_DURATION: () => METRIC_KESTREL_TLS_HANDSHAKE_DURATION,
  METRIC_KESTREL_UPGRADED_CONNECTIONS: () => METRIC_KESTREL_UPGRADED_CONNECTIONS,
  METRIC_SIGNALR_SERVER_ACTIVE_CONNECTIONS: () => METRIC_SIGNALR_SERVER_ACTIVE_CONNECTIONS,
  METRIC_SIGNALR_SERVER_CONNECTION_DURATION: () => METRIC_SIGNALR_SERVER_CONNECTION_DURATION,
  MessageTypeValues: () => MessageTypeValues,
  MessagingDestinationKindValues: () => MessagingDestinationKindValues,
  MessagingOperationValues: () => MessagingOperationValues,
  NETHOSTCONNECTIONSUBTYPEVALUES_CDMA: () => NETHOSTCONNECTIONSUBTYPEVALUES_CDMA,
  NETHOSTCONNECTIONSUBTYPEVALUES_CDMA2000_1XRTT: () => NETHOSTCONNECTIONSUBTYPEVALUES_CDMA2000_1XRTT,
  NETHOSTCONNECTIONSUBTYPEVALUES_EDGE: () => NETHOSTCONNECTIONSUBTYPEVALUES_EDGE,
  NETHOSTCONNECTIONSUBTYPEVALUES_EHRPD: () => NETHOSTCONNECTIONSUBTYPEVALUES_EHRPD,
  NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_0: () => NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_0,
  NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_A: () => NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_A,
  NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_B: () => NETHOSTCONNECTIONSUBTYPEVALUES_EVDO_B,
  NETHOSTCONNECTIONSUBTYPEVALUES_GPRS: () => NETHOSTCONNECTIONSUBTYPEVALUES_GPRS,
  NETHOSTCONNECTIONSUBTYPEVALUES_GSM: () => NETHOSTCONNECTIONSUBTYPEVALUES_GSM,
  NETHOSTCONNECTIONSUBTYPEVALUES_HSDPA: () => NETHOSTCONNECTIONSUBTYPEVALUES_HSDPA,
  NETHOSTCONNECTIONSUBTYPEVALUES_HSPA: () => NETHOSTCONNECTIONSUBTYPEVALUES_HSPA,
  NETHOSTCONNECTIONSUBTYPEVALUES_HSPAP: () => NETHOSTCONNECTIONSUBTYPEVALUES_HSPAP,
  NETHOSTCONNECTIONSUBTYPEVALUES_HSUPA: () => NETHOSTCONNECTIONSUBTYPEVALUES_HSUPA,
  NETHOSTCONNECTIONSUBTYPEVALUES_IDEN: () => NETHOSTCONNECTIONSUBTYPEVALUES_IDEN,
  NETHOSTCONNECTIONSUBTYPEVALUES_IWLAN: () => NETHOSTCONNECTIONSUBTYPEVALUES_IWLAN,
  NETHOSTCONNECTIONSUBTYPEVALUES_LTE: () => NETHOSTCONNECTIONSUBTYPEVALUES_LTE,
  NETHOSTCONNECTIONSUBTYPEVALUES_LTE_CA: () => NETHOSTCONNECTIONSUBTYPEVALUES_LTE_CA,
  NETHOSTCONNECTIONSUBTYPEVALUES_NR: () => NETHOSTCONNECTIONSUBTYPEVALUES_NR,
  NETHOSTCONNECTIONSUBTYPEVALUES_NRNSA: () => NETHOSTCONNECTIONSUBTYPEVALUES_NRNSA,
  NETHOSTCONNECTIONSUBTYPEVALUES_TD_SCDMA: () => NETHOSTCONNECTIONSUBTYPEVALUES_TD_SCDMA,
  NETHOSTCONNECTIONSUBTYPEVALUES_UMTS: () => NETHOSTCONNECTIONSUBTYPEVALUES_UMTS,
  NETHOSTCONNECTIONTYPEVALUES_CELL: () => NETHOSTCONNECTIONTYPEVALUES_CELL,
  NETHOSTCONNECTIONTYPEVALUES_UNAVAILABLE: () => NETHOSTCONNECTIONTYPEVALUES_UNAVAILABLE,
  NETHOSTCONNECTIONTYPEVALUES_UNKNOWN: () => NETHOSTCONNECTIONTYPEVALUES_UNKNOWN,
  NETHOSTCONNECTIONTYPEVALUES_WIFI: () => NETHOSTCONNECTIONTYPEVALUES_WIFI,
  NETHOSTCONNECTIONTYPEVALUES_WIRED: () => NETHOSTCONNECTIONTYPEVALUES_WIRED,
  NETTRANSPORTVALUES_INPROC: () => NETTRANSPORTVALUES_INPROC,
  NETTRANSPORTVALUES_IP: () => NETTRANSPORTVALUES_IP,
  NETTRANSPORTVALUES_IP_TCP: () => NETTRANSPORTVALUES_IP_TCP,
  NETTRANSPORTVALUES_IP_UDP: () => NETTRANSPORTVALUES_IP_UDP,
  NETTRANSPORTVALUES_OTHER: () => NETTRANSPORTVALUES_OTHER,
  NETTRANSPORTVALUES_PIPE: () => NETTRANSPORTVALUES_PIPE,
  NETTRANSPORTVALUES_UNIX: () => NETTRANSPORTVALUES_UNIX,
  NETWORK_TRANSPORT_VALUE_PIPE: () => NETWORK_TRANSPORT_VALUE_PIPE,
  NETWORK_TRANSPORT_VALUE_QUIC: () => NETWORK_TRANSPORT_VALUE_QUIC,
  NETWORK_TRANSPORT_VALUE_TCP: () => NETWORK_TRANSPORT_VALUE_TCP,
  NETWORK_TRANSPORT_VALUE_UDP: () => NETWORK_TRANSPORT_VALUE_UDP,
  NETWORK_TRANSPORT_VALUE_UNIX: () => NETWORK_TRANSPORT_VALUE_UNIX,
  NETWORK_TYPE_VALUE_IPV4: () => NETWORK_TYPE_VALUE_IPV4,
  NETWORK_TYPE_VALUE_IPV6: () => NETWORK_TYPE_VALUE_IPV6,
  NetHostConnectionSubtypeValues: () => NetHostConnectionSubtypeValues,
  NetHostConnectionTypeValues: () => NetHostConnectionTypeValues,
  NetTransportValues: () => NetTransportValues,
  OSTYPEVALUES_AIX: () => OSTYPEVALUES_AIX,
  OSTYPEVALUES_DARWIN: () => OSTYPEVALUES_DARWIN,
  OSTYPEVALUES_DRAGONFLYBSD: () => OSTYPEVALUES_DRAGONFLYBSD,
  OSTYPEVALUES_FREEBSD: () => OSTYPEVALUES_FREEBSD,
  OSTYPEVALUES_HPUX: () => OSTYPEVALUES_HPUX,
  OSTYPEVALUES_LINUX: () => OSTYPEVALUES_LINUX,
  OSTYPEVALUES_NETBSD: () => OSTYPEVALUES_NETBSD,
  OSTYPEVALUES_OPENBSD: () => OSTYPEVALUES_OPENBSD,
  OSTYPEVALUES_SOLARIS: () => OSTYPEVALUES_SOLARIS,
  OSTYPEVALUES_WINDOWS: () => OSTYPEVALUES_WINDOWS,
  OSTYPEVALUES_Z_OS: () => OSTYPEVALUES_Z_OS,
  OTEL_STATUS_CODE_VALUE_ERROR: () => OTEL_STATUS_CODE_VALUE_ERROR,
  OTEL_STATUS_CODE_VALUE_OK: () => OTEL_STATUS_CODE_VALUE_OK,
  OsTypeValues: () => OsTypeValues,
  RPCGRPCSTATUSCODEVALUES_ABORTED: () => RPCGRPCSTATUSCODEVALUES_ABORTED,
  RPCGRPCSTATUSCODEVALUES_ALREADY_EXISTS: () => RPCGRPCSTATUSCODEVALUES_ALREADY_EXISTS,
  RPCGRPCSTATUSCODEVALUES_CANCELLED: () => RPCGRPCSTATUSCODEVALUES_CANCELLED,
  RPCGRPCSTATUSCODEVALUES_DATA_LOSS: () => RPCGRPCSTATUSCODEVALUES_DATA_LOSS,
  RPCGRPCSTATUSCODEVALUES_DEADLINE_EXCEEDED: () => RPCGRPCSTATUSCODEVALUES_DEADLINE_EXCEEDED,
  RPCGRPCSTATUSCODEVALUES_FAILED_PRECONDITION: () => RPCGRPCSTATUSCODEVALUES_FAILED_PRECONDITION,
  RPCGRPCSTATUSCODEVALUES_INTERNAL: () => RPCGRPCSTATUSCODEVALUES_INTERNAL,
  RPCGRPCSTATUSCODEVALUES_INVALID_ARGUMENT: () => RPCGRPCSTATUSCODEVALUES_INVALID_ARGUMENT,
  RPCGRPCSTATUSCODEVALUES_NOT_FOUND: () => RPCGRPCSTATUSCODEVALUES_NOT_FOUND,
  RPCGRPCSTATUSCODEVALUES_OK: () => RPCGRPCSTATUSCODEVALUES_OK,
  RPCGRPCSTATUSCODEVALUES_OUT_OF_RANGE: () => RPCGRPCSTATUSCODEVALUES_OUT_OF_RANGE,
  RPCGRPCSTATUSCODEVALUES_PERMISSION_DENIED: () => RPCGRPCSTATUSCODEVALUES_PERMISSION_DENIED,
  RPCGRPCSTATUSCODEVALUES_RESOURCE_EXHAUSTED: () => RPCGRPCSTATUSCODEVALUES_RESOURCE_EXHAUSTED,
  RPCGRPCSTATUSCODEVALUES_UNAUTHENTICATED: () => RPCGRPCSTATUSCODEVALUES_UNAUTHENTICATED,
  RPCGRPCSTATUSCODEVALUES_UNAVAILABLE: () => RPCGRPCSTATUSCODEVALUES_UNAVAILABLE,
  RPCGRPCSTATUSCODEVALUES_UNIMPLEMENTED: () => RPCGRPCSTATUSCODEVALUES_UNIMPLEMENTED,
  RPCGRPCSTATUSCODEVALUES_UNKNOWN: () => RPCGRPCSTATUSCODEVALUES_UNKNOWN,
  RpcGrpcStatusCodeValues: () => RpcGrpcStatusCodeValues,
  SEMATTRS_AWS_DYNAMODB_ATTRIBUTES_TO_GET: () => SEMATTRS_AWS_DYNAMODB_ATTRIBUTES_TO_GET,
  SEMATTRS_AWS_DYNAMODB_ATTRIBUTE_DEFINITIONS: () => SEMATTRS_AWS_DYNAMODB_ATTRIBUTE_DEFINITIONS,
  SEMATTRS_AWS_DYNAMODB_CONSISTENT_READ: () => SEMATTRS_AWS_DYNAMODB_CONSISTENT_READ,
  SEMATTRS_AWS_DYNAMODB_CONSUMED_CAPACITY: () => SEMATTRS_AWS_DYNAMODB_CONSUMED_CAPACITY,
  SEMATTRS_AWS_DYNAMODB_COUNT: () => SEMATTRS_AWS_DYNAMODB_COUNT,
  SEMATTRS_AWS_DYNAMODB_EXCLUSIVE_START_TABLE: () => SEMATTRS_AWS_DYNAMODB_EXCLUSIVE_START_TABLE,
  SEMATTRS_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEXES: () => SEMATTRS_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEXES,
  SEMATTRS_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEX_UPDATES: () => SEMATTRS_AWS_DYNAMODB_GLOBAL_SECONDARY_INDEX_UPDATES,
  SEMATTRS_AWS_DYNAMODB_INDEX_NAME: () => SEMATTRS_AWS_DYNAMODB_INDEX_NAME,
  SEMATTRS_AWS_DYNAMODB_ITEM_COLLECTION_METRICS: () => SEMATTRS_AWS_DYNAMODB_ITEM_COLLECTION_METRICS,
  SEMATTRS_AWS_DYNAMODB_LIMIT: () => SEMATTRS_AWS_DYNAMODB_LIMIT,
  SEMATTRS_AWS_DYNAMODB_LOCAL_SECONDARY_INDEXES: () => SEMATTRS_AWS_DYNAMODB_LOCAL_SECONDARY_INDEXES,
  SEMATTRS_AWS_DYNAMODB_PROJECTION: () => SEMATTRS_AWS_DYNAMODB_PROJECTION,
  SEMATTRS_AWS_DYNAMODB_PROVISIONED_READ_CAPACITY: () => SEMATTRS_AWS_DYNAMODB_PROVISIONED_READ_CAPACITY,
  SEMATTRS_AWS_DYNAMODB_PROVISIONED_WRITE_CAPACITY: () => SEMATTRS_AWS_DYNAMODB_PROVISIONED_WRITE_CAPACITY,
  SEMATTRS_AWS_DYNAMODB_SCANNED_COUNT: () => SEMATTRS_AWS_DYNAMODB_SCANNED_COUNT,
  SEMATTRS_AWS_DYNAMODB_SCAN_FORWARD: () => SEMATTRS_AWS_DYNAMODB_SCAN_FORWARD,
  SEMATTRS_AWS_DYNAMODB_SEGMENT: () => SEMATTRS_AWS_DYNAMODB_SEGMENT,
  SEMATTRS_AWS_DYNAMODB_SELECT: () => SEMATTRS_AWS_DYNAMODB_SELECT,
  SEMATTRS_AWS_DYNAMODB_TABLE_COUNT: () => SEMATTRS_AWS_DYNAMODB_TABLE_COUNT,
  SEMATTRS_AWS_DYNAMODB_TABLE_NAMES: () => SEMATTRS_AWS_DYNAMODB_TABLE_NAMES,
  SEMATTRS_AWS_DYNAMODB_TOTAL_SEGMENTS: () => SEMATTRS_AWS_DYNAMODB_TOTAL_SEGMENTS,
  SEMATTRS_AWS_LAMBDA_INVOKED_ARN: () => SEMATTRS_AWS_LAMBDA_INVOKED_ARN,
  SEMATTRS_CODE_FILEPATH: () => SEMATTRS_CODE_FILEPATH,
  SEMATTRS_CODE_FUNCTION: () => SEMATTRS_CODE_FUNCTION,
  SEMATTRS_CODE_LINENO: () => SEMATTRS_CODE_LINENO,
  SEMATTRS_CODE_NAMESPACE: () => SEMATTRS_CODE_NAMESPACE,
  SEMATTRS_DB_CASSANDRA_CONSISTENCY_LEVEL: () => SEMATTRS_DB_CASSANDRA_CONSISTENCY_LEVEL,
  SEMATTRS_DB_CASSANDRA_COORDINATOR_DC: () => SEMATTRS_DB_CASSANDRA_COORDINATOR_DC,
  SEMATTRS_DB_CASSANDRA_COORDINATOR_ID: () => SEMATTRS_DB_CASSANDRA_COORDINATOR_ID,
  SEMATTRS_DB_CASSANDRA_IDEMPOTENCE: () => SEMATTRS_DB_CASSANDRA_IDEMPOTENCE,
  SEMATTRS_DB_CASSANDRA_KEYSPACE: () => SEMATTRS_DB_CASSANDRA_KEYSPACE,
  SEMATTRS_DB_CASSANDRA_PAGE_SIZE: () => SEMATTRS_DB_CASSANDRA_PAGE_SIZE,
  SEMATTRS_DB_CASSANDRA_SPECULATIVE_EXECUTION_COUNT: () => SEMATTRS_DB_CASSANDRA_SPECULATIVE_EXECUTION_COUNT,
  SEMATTRS_DB_CASSANDRA_TABLE: () => SEMATTRS_DB_CASSANDRA_TABLE,
  SEMATTRS_DB_CONNECTION_STRING: () => SEMATTRS_DB_CONNECTION_STRING,
  SEMATTRS_DB_HBASE_NAMESPACE: () => SEMATTRS_DB_HBASE_NAMESPACE,
  SEMATTRS_DB_JDBC_DRIVER_CLASSNAME: () => SEMATTRS_DB_JDBC_DRIVER_CLASSNAME,
  SEMATTRS_DB_MONGODB_COLLECTION: () => SEMATTRS_DB_MONGODB_COLLECTION,
  SEMATTRS_DB_MSSQL_INSTANCE_NAME: () => SEMATTRS_DB_MSSQL_INSTANCE_NAME,
  SEMATTRS_DB_NAME: () => SEMATTRS_DB_NAME,
  SEMATTRS_DB_OPERATION: () => SEMATTRS_DB_OPERATION,
  SEMATTRS_DB_REDIS_DATABASE_INDEX: () => SEMATTRS_DB_REDIS_DATABASE_INDEX,
  SEMATTRS_DB_SQL_TABLE: () => SEMATTRS_DB_SQL_TABLE,
  SEMATTRS_DB_STATEMENT: () => SEMATTRS_DB_STATEMENT,
  SEMATTRS_DB_SYSTEM: () => SEMATTRS_DB_SYSTEM,
  SEMATTRS_DB_USER: () => SEMATTRS_DB_USER,
  SEMATTRS_ENDUSER_ID: () => SEMATTRS_ENDUSER_ID,
  SEMATTRS_ENDUSER_ROLE: () => SEMATTRS_ENDUSER_ROLE,
  SEMATTRS_ENDUSER_SCOPE: () => SEMATTRS_ENDUSER_SCOPE,
  SEMATTRS_EXCEPTION_ESCAPED: () => SEMATTRS_EXCEPTION_ESCAPED,
  SEMATTRS_EXCEPTION_MESSAGE: () => SEMATTRS_EXCEPTION_MESSAGE,
  SEMATTRS_EXCEPTION_STACKTRACE: () => SEMATTRS_EXCEPTION_STACKTRACE,
  SEMATTRS_EXCEPTION_TYPE: () => SEMATTRS_EXCEPTION_TYPE,
  SEMATTRS_FAAS_COLDSTART: () => SEMATTRS_FAAS_COLDSTART,
  SEMATTRS_FAAS_CRON: () => SEMATTRS_FAAS_CRON,
  SEMATTRS_FAAS_DOCUMENT_COLLECTION: () => SEMATTRS_FAAS_DOCUMENT_COLLECTION,
  SEMATTRS_FAAS_DOCUMENT_NAME: () => SEMATTRS_FAAS_DOCUMENT_NAME,
  SEMATTRS_FAAS_DOCUMENT_OPERATION: () => SEMATTRS_FAAS_DOCUMENT_OPERATION,
  SEMATTRS_FAAS_DOCUMENT_TIME: () => SEMATTRS_FAAS_DOCUMENT_TIME,
  SEMATTRS_FAAS_EXECUTION: () => SEMATTRS_FAAS_EXECUTION,
  SEMATTRS_FAAS_INVOKED_NAME: () => SEMATTRS_FAAS_INVOKED_NAME,
  SEMATTRS_FAAS_INVOKED_PROVIDER: () => SEMATTRS_FAAS_INVOKED_PROVIDER,
  SEMATTRS_FAAS_INVOKED_REGION: () => SEMATTRS_FAAS_INVOKED_REGION,
  SEMATTRS_FAAS_TIME: () => SEMATTRS_FAAS_TIME,
  SEMATTRS_FAAS_TRIGGER: () => SEMATTRS_FAAS_TRIGGER,
  SEMATTRS_HTTP_CLIENT_IP: () => SEMATTRS_HTTP_CLIENT_IP,
  SEMATTRS_HTTP_FLAVOR: () => SEMATTRS_HTTP_FLAVOR,
  SEMATTRS_HTTP_HOST: () => SEMATTRS_HTTP_HOST,
  SEMATTRS_HTTP_METHOD: () => SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH: () => SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH,
  SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED: () => SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH_UNCOMPRESSED,
  SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH: () => SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH,
  SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED: () => SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH_UNCOMPRESSED,
  SEMATTRS_HTTP_ROUTE: () => SEMATTRS_HTTP_ROUTE,
  SEMATTRS_HTTP_SCHEME: () => SEMATTRS_HTTP_SCHEME,
  SEMATTRS_HTTP_SERVER_NAME: () => SEMATTRS_HTTP_SERVER_NAME,
  SEMATTRS_HTTP_STATUS_CODE: () => SEMATTRS_HTTP_STATUS_CODE,
  SEMATTRS_HTTP_TARGET: () => SEMATTRS_HTTP_TARGET,
  SEMATTRS_HTTP_URL: () => SEMATTRS_HTTP_URL,
  SEMATTRS_HTTP_USER_AGENT: () => SEMATTRS_HTTP_USER_AGENT,
  SEMATTRS_MESSAGE_COMPRESSED_SIZE: () => SEMATTRS_MESSAGE_COMPRESSED_SIZE,
  SEMATTRS_MESSAGE_ID: () => SEMATTRS_MESSAGE_ID,
  SEMATTRS_MESSAGE_TYPE: () => SEMATTRS_MESSAGE_TYPE,
  SEMATTRS_MESSAGE_UNCOMPRESSED_SIZE: () => SEMATTRS_MESSAGE_UNCOMPRESSED_SIZE,
  SEMATTRS_MESSAGING_CONSUMER_ID: () => SEMATTRS_MESSAGING_CONSUMER_ID,
  SEMATTRS_MESSAGING_CONVERSATION_ID: () => SEMATTRS_MESSAGING_CONVERSATION_ID,
  SEMATTRS_MESSAGING_DESTINATION: () => SEMATTRS_MESSAGING_DESTINATION,
  SEMATTRS_MESSAGING_DESTINATION_KIND: () => SEMATTRS_MESSAGING_DESTINATION_KIND,
  SEMATTRS_MESSAGING_KAFKA_CLIENT_ID: () => SEMATTRS_MESSAGING_KAFKA_CLIENT_ID,
  SEMATTRS_MESSAGING_KAFKA_CONSUMER_GROUP: () => SEMATTRS_MESSAGING_KAFKA_CONSUMER_GROUP,
  SEMATTRS_MESSAGING_KAFKA_MESSAGE_KEY: () => SEMATTRS_MESSAGING_KAFKA_MESSAGE_KEY,
  SEMATTRS_MESSAGING_KAFKA_PARTITION: () => SEMATTRS_MESSAGING_KAFKA_PARTITION,
  SEMATTRS_MESSAGING_KAFKA_TOMBSTONE: () => SEMATTRS_MESSAGING_KAFKA_TOMBSTONE,
  SEMATTRS_MESSAGING_MESSAGE_ID: () => SEMATTRS_MESSAGING_MESSAGE_ID,
  SEMATTRS_MESSAGING_MESSAGE_PAYLOAD_COMPRESSED_SIZE_BYTES: () => SEMATTRS_MESSAGING_MESSAGE_PAYLOAD_COMPRESSED_SIZE_BYTES,
  SEMATTRS_MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES: () => SEMATTRS_MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES,
  SEMATTRS_MESSAGING_OPERATION: () => SEMATTRS_MESSAGING_OPERATION,
  SEMATTRS_MESSAGING_PROTOCOL: () => SEMATTRS_MESSAGING_PROTOCOL,
  SEMATTRS_MESSAGING_PROTOCOL_VERSION: () => SEMATTRS_MESSAGING_PROTOCOL_VERSION,
  SEMATTRS_MESSAGING_RABBITMQ_ROUTING_KEY: () => SEMATTRS_MESSAGING_RABBITMQ_ROUTING_KEY,
  SEMATTRS_MESSAGING_SYSTEM: () => SEMATTRS_MESSAGING_SYSTEM,
  SEMATTRS_MESSAGING_TEMP_DESTINATION: () => SEMATTRS_MESSAGING_TEMP_DESTINATION,
  SEMATTRS_MESSAGING_URL: () => SEMATTRS_MESSAGING_URL,
  SEMATTRS_NET_HOST_CARRIER_ICC: () => SEMATTRS_NET_HOST_CARRIER_ICC,
  SEMATTRS_NET_HOST_CARRIER_MCC: () => SEMATTRS_NET_HOST_CARRIER_MCC,
  SEMATTRS_NET_HOST_CARRIER_MNC: () => SEMATTRS_NET_HOST_CARRIER_MNC,
  SEMATTRS_NET_HOST_CARRIER_NAME: () => SEMATTRS_NET_HOST_CARRIER_NAME,
  SEMATTRS_NET_HOST_CONNECTION_SUBTYPE: () => SEMATTRS_NET_HOST_CONNECTION_SUBTYPE,
  SEMATTRS_NET_HOST_CONNECTION_TYPE: () => SEMATTRS_NET_HOST_CONNECTION_TYPE,
  SEMATTRS_NET_HOST_IP: () => SEMATTRS_NET_HOST_IP,
  SEMATTRS_NET_HOST_NAME: () => SEMATTRS_NET_HOST_NAME,
  SEMATTRS_NET_HOST_PORT: () => SEMATTRS_NET_HOST_PORT,
  SEMATTRS_NET_PEER_IP: () => SEMATTRS_NET_PEER_IP,
  SEMATTRS_NET_PEER_NAME: () => SEMATTRS_NET_PEER_NAME,
  SEMATTRS_NET_PEER_PORT: () => SEMATTRS_NET_PEER_PORT,
  SEMATTRS_NET_TRANSPORT: () => SEMATTRS_NET_TRANSPORT,
  SEMATTRS_PEER_SERVICE: () => SEMATTRS_PEER_SERVICE,
  SEMATTRS_RPC_GRPC_STATUS_CODE: () => SEMATTRS_RPC_GRPC_STATUS_CODE,
  SEMATTRS_RPC_JSONRPC_ERROR_CODE: () => SEMATTRS_RPC_JSONRPC_ERROR_CODE,
  SEMATTRS_RPC_JSONRPC_ERROR_MESSAGE: () => SEMATTRS_RPC_JSONRPC_ERROR_MESSAGE,
  SEMATTRS_RPC_JSONRPC_REQUEST_ID: () => SEMATTRS_RPC_JSONRPC_REQUEST_ID,
  SEMATTRS_RPC_JSONRPC_VERSION: () => SEMATTRS_RPC_JSONRPC_VERSION,
  SEMATTRS_RPC_METHOD: () => SEMATTRS_RPC_METHOD,
  SEMATTRS_RPC_SERVICE: () => SEMATTRS_RPC_SERVICE,
  SEMATTRS_RPC_SYSTEM: () => SEMATTRS_RPC_SYSTEM,
  SEMATTRS_THREAD_ID: () => SEMATTRS_THREAD_ID,
  SEMATTRS_THREAD_NAME: () => SEMATTRS_THREAD_NAME,
  SEMRESATTRS_AWS_ECS_CLUSTER_ARN: () => SEMRESATTRS_AWS_ECS_CLUSTER_ARN,
  SEMRESATTRS_AWS_ECS_CONTAINER_ARN: () => SEMRESATTRS_AWS_ECS_CONTAINER_ARN,
  SEMRESATTRS_AWS_ECS_LAUNCHTYPE: () => SEMRESATTRS_AWS_ECS_LAUNCHTYPE,
  SEMRESATTRS_AWS_ECS_TASK_ARN: () => SEMRESATTRS_AWS_ECS_TASK_ARN,
  SEMRESATTRS_AWS_ECS_TASK_FAMILY: () => SEMRESATTRS_AWS_ECS_TASK_FAMILY,
  SEMRESATTRS_AWS_ECS_TASK_REVISION: () => SEMRESATTRS_AWS_ECS_TASK_REVISION,
  SEMRESATTRS_AWS_EKS_CLUSTER_ARN: () => SEMRESATTRS_AWS_EKS_CLUSTER_ARN,
  SEMRESATTRS_AWS_LOG_GROUP_ARNS: () => SEMRESATTRS_AWS_LOG_GROUP_ARNS,
  SEMRESATTRS_AWS_LOG_GROUP_NAMES: () => SEMRESATTRS_AWS_LOG_GROUP_NAMES,
  SEMRESATTRS_AWS_LOG_STREAM_ARNS: () => SEMRESATTRS_AWS_LOG_STREAM_ARNS,
  SEMRESATTRS_AWS_LOG_STREAM_NAMES: () => SEMRESATTRS_AWS_LOG_STREAM_NAMES,
  SEMRESATTRS_CLOUD_ACCOUNT_ID: () => SEMRESATTRS_CLOUD_ACCOUNT_ID,
  SEMRESATTRS_CLOUD_AVAILABILITY_ZONE: () => SEMRESATTRS_CLOUD_AVAILABILITY_ZONE,
  SEMRESATTRS_CLOUD_PLATFORM: () => SEMRESATTRS_CLOUD_PLATFORM,
  SEMRESATTRS_CLOUD_PROVIDER: () => SEMRESATTRS_CLOUD_PROVIDER,
  SEMRESATTRS_CLOUD_REGION: () => SEMRESATTRS_CLOUD_REGION,
  SEMRESATTRS_CONTAINER_ID: () => SEMRESATTRS_CONTAINER_ID,
  SEMRESATTRS_CONTAINER_IMAGE_NAME: () => SEMRESATTRS_CONTAINER_IMAGE_NAME,
  SEMRESATTRS_CONTAINER_IMAGE_TAG: () => SEMRESATTRS_CONTAINER_IMAGE_TAG,
  SEMRESATTRS_CONTAINER_NAME: () => SEMRESATTRS_CONTAINER_NAME,
  SEMRESATTRS_CONTAINER_RUNTIME: () => SEMRESATTRS_CONTAINER_RUNTIME,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT: () => SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_DEVICE_ID: () => SEMRESATTRS_DEVICE_ID,
  SEMRESATTRS_DEVICE_MODEL_IDENTIFIER: () => SEMRESATTRS_DEVICE_MODEL_IDENTIFIER,
  SEMRESATTRS_DEVICE_MODEL_NAME: () => SEMRESATTRS_DEVICE_MODEL_NAME,
  SEMRESATTRS_FAAS_ID: () => SEMRESATTRS_FAAS_ID,
  SEMRESATTRS_FAAS_INSTANCE: () => SEMRESATTRS_FAAS_INSTANCE,
  SEMRESATTRS_FAAS_MAX_MEMORY: () => SEMRESATTRS_FAAS_MAX_MEMORY,
  SEMRESATTRS_FAAS_NAME: () => SEMRESATTRS_FAAS_NAME,
  SEMRESATTRS_FAAS_VERSION: () => SEMRESATTRS_FAAS_VERSION,
  SEMRESATTRS_HOST_ARCH: () => SEMRESATTRS_HOST_ARCH,
  SEMRESATTRS_HOST_ID: () => SEMRESATTRS_HOST_ID,
  SEMRESATTRS_HOST_IMAGE_ID: () => SEMRESATTRS_HOST_IMAGE_ID,
  SEMRESATTRS_HOST_IMAGE_NAME: () => SEMRESATTRS_HOST_IMAGE_NAME,
  SEMRESATTRS_HOST_IMAGE_VERSION: () => SEMRESATTRS_HOST_IMAGE_VERSION,
  SEMRESATTRS_HOST_NAME: () => SEMRESATTRS_HOST_NAME,
  SEMRESATTRS_HOST_TYPE: () => SEMRESATTRS_HOST_TYPE,
  SEMRESATTRS_K8S_CLUSTER_NAME: () => SEMRESATTRS_K8S_CLUSTER_NAME,
  SEMRESATTRS_K8S_CONTAINER_NAME: () => SEMRESATTRS_K8S_CONTAINER_NAME,
  SEMRESATTRS_K8S_CRONJOB_NAME: () => SEMRESATTRS_K8S_CRONJOB_NAME,
  SEMRESATTRS_K8S_CRONJOB_UID: () => SEMRESATTRS_K8S_CRONJOB_UID,
  SEMRESATTRS_K8S_DAEMONSET_NAME: () => SEMRESATTRS_K8S_DAEMONSET_NAME,
  SEMRESATTRS_K8S_DAEMONSET_UID: () => SEMRESATTRS_K8S_DAEMONSET_UID,
  SEMRESATTRS_K8S_DEPLOYMENT_NAME: () => SEMRESATTRS_K8S_DEPLOYMENT_NAME,
  SEMRESATTRS_K8S_DEPLOYMENT_UID: () => SEMRESATTRS_K8S_DEPLOYMENT_UID,
  SEMRESATTRS_K8S_JOB_NAME: () => SEMRESATTRS_K8S_JOB_NAME,
  SEMRESATTRS_K8S_JOB_UID: () => SEMRESATTRS_K8S_JOB_UID,
  SEMRESATTRS_K8S_NAMESPACE_NAME: () => SEMRESATTRS_K8S_NAMESPACE_NAME,
  SEMRESATTRS_K8S_NODE_NAME: () => SEMRESATTRS_K8S_NODE_NAME,
  SEMRESATTRS_K8S_NODE_UID: () => SEMRESATTRS_K8S_NODE_UID,
  SEMRESATTRS_K8S_POD_NAME: () => SEMRESATTRS_K8S_POD_NAME,
  SEMRESATTRS_K8S_POD_UID: () => SEMRESATTRS_K8S_POD_UID,
  SEMRESATTRS_K8S_REPLICASET_NAME: () => SEMRESATTRS_K8S_REPLICASET_NAME,
  SEMRESATTRS_K8S_REPLICASET_UID: () => SEMRESATTRS_K8S_REPLICASET_UID,
  SEMRESATTRS_K8S_STATEFULSET_NAME: () => SEMRESATTRS_K8S_STATEFULSET_NAME,
  SEMRESATTRS_K8S_STATEFULSET_UID: () => SEMRESATTRS_K8S_STATEFULSET_UID,
  SEMRESATTRS_OS_DESCRIPTION: () => SEMRESATTRS_OS_DESCRIPTION,
  SEMRESATTRS_OS_NAME: () => SEMRESATTRS_OS_NAME,
  SEMRESATTRS_OS_TYPE: () => SEMRESATTRS_OS_TYPE,
  SEMRESATTRS_OS_VERSION: () => SEMRESATTRS_OS_VERSION,
  SEMRESATTRS_PROCESS_COMMAND: () => SEMRESATTRS_PROCESS_COMMAND,
  SEMRESATTRS_PROCESS_COMMAND_ARGS: () => SEMRESATTRS_PROCESS_COMMAND_ARGS,
  SEMRESATTRS_PROCESS_COMMAND_LINE: () => SEMRESATTRS_PROCESS_COMMAND_LINE,
  SEMRESATTRS_PROCESS_EXECUTABLE_NAME: () => SEMRESATTRS_PROCESS_EXECUTABLE_NAME,
  SEMRESATTRS_PROCESS_EXECUTABLE_PATH: () => SEMRESATTRS_PROCESS_EXECUTABLE_PATH,
  SEMRESATTRS_PROCESS_OWNER: () => SEMRESATTRS_PROCESS_OWNER,
  SEMRESATTRS_PROCESS_PID: () => SEMRESATTRS_PROCESS_PID,
  SEMRESATTRS_PROCESS_RUNTIME_DESCRIPTION: () => SEMRESATTRS_PROCESS_RUNTIME_DESCRIPTION,
  SEMRESATTRS_PROCESS_RUNTIME_NAME: () => SEMRESATTRS_PROCESS_RUNTIME_NAME,
  SEMRESATTRS_PROCESS_RUNTIME_VERSION: () => SEMRESATTRS_PROCESS_RUNTIME_VERSION,
  SEMRESATTRS_SERVICE_INSTANCE_ID: () => SEMRESATTRS_SERVICE_INSTANCE_ID,
  SEMRESATTRS_SERVICE_NAME: () => SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_NAMESPACE: () => SEMRESATTRS_SERVICE_NAMESPACE,
  SEMRESATTRS_SERVICE_VERSION: () => SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_TELEMETRY_AUTO_VERSION: () => SEMRESATTRS_TELEMETRY_AUTO_VERSION,
  SEMRESATTRS_TELEMETRY_SDK_LANGUAGE: () => SEMRESATTRS_TELEMETRY_SDK_LANGUAGE,
  SEMRESATTRS_TELEMETRY_SDK_NAME: () => SEMRESATTRS_TELEMETRY_SDK_NAME,
  SEMRESATTRS_TELEMETRY_SDK_VERSION: () => SEMRESATTRS_TELEMETRY_SDK_VERSION,
  SEMRESATTRS_WEBENGINE_DESCRIPTION: () => SEMRESATTRS_WEBENGINE_DESCRIPTION,
  SEMRESATTRS_WEBENGINE_NAME: () => SEMRESATTRS_WEBENGINE_NAME,
  SEMRESATTRS_WEBENGINE_VERSION: () => SEMRESATTRS_WEBENGINE_VERSION,
  SIGNALR_CONNECTION_STATUS_VALUE_APP_SHUTDOWN: () => SIGNALR_CONNECTION_STATUS_VALUE_APP_SHUTDOWN,
  SIGNALR_CONNECTION_STATUS_VALUE_NORMAL_CLOSURE: () => SIGNALR_CONNECTION_STATUS_VALUE_NORMAL_CLOSURE,
  SIGNALR_CONNECTION_STATUS_VALUE_TIMEOUT: () => SIGNALR_CONNECTION_STATUS_VALUE_TIMEOUT,
  SIGNALR_TRANSPORT_VALUE_LONG_POLLING: () => SIGNALR_TRANSPORT_VALUE_LONG_POLLING,
  SIGNALR_TRANSPORT_VALUE_SERVER_SENT_EVENTS: () => SIGNALR_TRANSPORT_VALUE_SERVER_SENT_EVENTS,
  SIGNALR_TRANSPORT_VALUE_WEB_SOCKETS: () => SIGNALR_TRANSPORT_VALUE_WEB_SOCKETS,
  SemanticAttributes: () => SemanticAttributes,
  SemanticResourceAttributes: () => SemanticResourceAttributes,
  TELEMETRYSDKLANGUAGEVALUES_CPP: () => TELEMETRYSDKLANGUAGEVALUES_CPP,
  TELEMETRYSDKLANGUAGEVALUES_DOTNET: () => TELEMETRYSDKLANGUAGEVALUES_DOTNET,
  TELEMETRYSDKLANGUAGEVALUES_ERLANG: () => TELEMETRYSDKLANGUAGEVALUES_ERLANG,
  TELEMETRYSDKLANGUAGEVALUES_GO: () => TELEMETRYSDKLANGUAGEVALUES_GO,
  TELEMETRYSDKLANGUAGEVALUES_JAVA: () => TELEMETRYSDKLANGUAGEVALUES_JAVA,
  TELEMETRYSDKLANGUAGEVALUES_NODEJS: () => TELEMETRYSDKLANGUAGEVALUES_NODEJS,
  TELEMETRYSDKLANGUAGEVALUES_PHP: () => TELEMETRYSDKLANGUAGEVALUES_PHP,
  TELEMETRYSDKLANGUAGEVALUES_PYTHON: () => TELEMETRYSDKLANGUAGEVALUES_PYTHON,
  TELEMETRYSDKLANGUAGEVALUES_RUBY: () => TELEMETRYSDKLANGUAGEVALUES_RUBY,
  TELEMETRYSDKLANGUAGEVALUES_WEBJS: () => TELEMETRYSDKLANGUAGEVALUES_WEBJS,
  TELEMETRY_SDK_LANGUAGE_VALUE_CPP: () => TELEMETRY_SDK_LANGUAGE_VALUE_CPP,
  TELEMETRY_SDK_LANGUAGE_VALUE_DOTNET: () => TELEMETRY_SDK_LANGUAGE_VALUE_DOTNET,
  TELEMETRY_SDK_LANGUAGE_VALUE_ERLANG: () => TELEMETRY_SDK_LANGUAGE_VALUE_ERLANG,
  TELEMETRY_SDK_LANGUAGE_VALUE_GO: () => TELEMETRY_SDK_LANGUAGE_VALUE_GO,
  TELEMETRY_SDK_LANGUAGE_VALUE_JAVA: () => TELEMETRY_SDK_LANGUAGE_VALUE_JAVA,
  TELEMETRY_SDK_LANGUAGE_VALUE_NODEJS: () => TELEMETRY_SDK_LANGUAGE_VALUE_NODEJS,
  TELEMETRY_SDK_LANGUAGE_VALUE_PHP: () => TELEMETRY_SDK_LANGUAGE_VALUE_PHP,
  TELEMETRY_SDK_LANGUAGE_VALUE_PYTHON: () => TELEMETRY_SDK_LANGUAGE_VALUE_PYTHON,
  TELEMETRY_SDK_LANGUAGE_VALUE_RUBY: () => TELEMETRY_SDK_LANGUAGE_VALUE_RUBY,
  TELEMETRY_SDK_LANGUAGE_VALUE_RUST: () => TELEMETRY_SDK_LANGUAGE_VALUE_RUST,
  TELEMETRY_SDK_LANGUAGE_VALUE_SWIFT: () => TELEMETRY_SDK_LANGUAGE_VALUE_SWIFT,
  TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS: () => TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS,
  TelemetrySdkLanguageValues: () => TelemetrySdkLanguageValues
});
var init_esm2 = __esm({
  "node_modules/@opentelemetry/semantic-conventions/build/esm/index.js"() {
    init_trace2();
    init_resource();
    init_stable_attributes();
    init_stable_metrics();
    init_stable_events();
  }
});

// node_modules/@opentelemetry/core/build/src/semconv.js
var require_semconv = __commonJS({
  "node_modules/@opentelemetry/core/build/src/semconv.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ATTR_PROCESS_RUNTIME_NAME = void 0;
    exports2.ATTR_PROCESS_RUNTIME_NAME = "process.runtime.name";
  }
});

// node_modules/@opentelemetry/core/build/src/platform/node/sdk-info.js
var require_sdk_info = __commonJS({
  "node_modules/@opentelemetry/core/build/src/platform/node/sdk-info.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SDK_INFO = void 0;
    var version_1 = require_version2();
    var semantic_conventions_1 = (init_esm2(), __toCommonJS(esm_exports2));
    var semconv_1 = require_semconv();
    exports2.SDK_INFO = {
      [semantic_conventions_1.ATTR_TELEMETRY_SDK_NAME]: "opentelemetry",
      [semconv_1.ATTR_PROCESS_RUNTIME_NAME]: "node",
      [semantic_conventions_1.ATTR_TELEMETRY_SDK_LANGUAGE]: semantic_conventions_1.TELEMETRY_SDK_LANGUAGE_VALUE_NODEJS,
      [semantic_conventions_1.ATTR_TELEMETRY_SDK_VERSION]: version_1.VERSION
    };
  }
});

// node_modules/@opentelemetry/core/build/src/platform/node/index.js
var require_node = __commonJS({
  "node_modules/@opentelemetry/core/build/src/platform/node/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SDK_INFO = exports2.otperformance = exports2._globalThis = exports2.getStringListFromEnv = exports2.getNumberFromEnv = exports2.getBooleanFromEnv = exports2.getStringFromEnv = void 0;
    var environment_1 = require_environment();
    Object.defineProperty(exports2, "getStringFromEnv", { enumerable: true, get: function() {
      return environment_1.getStringFromEnv;
    } });
    Object.defineProperty(exports2, "getBooleanFromEnv", { enumerable: true, get: function() {
      return environment_1.getBooleanFromEnv;
    } });
    Object.defineProperty(exports2, "getNumberFromEnv", { enumerable: true, get: function() {
      return environment_1.getNumberFromEnv;
    } });
    Object.defineProperty(exports2, "getStringListFromEnv", { enumerable: true, get: function() {
      return environment_1.getStringListFromEnv;
    } });
    var globalThis_1 = require_globalThis();
    Object.defineProperty(exports2, "_globalThis", { enumerable: true, get: function() {
      return globalThis_1._globalThis;
    } });
    var performance_1 = require_performance();
    Object.defineProperty(exports2, "otperformance", { enumerable: true, get: function() {
      return performance_1.otperformance;
    } });
    var sdk_info_1 = require_sdk_info();
    Object.defineProperty(exports2, "SDK_INFO", { enumerable: true, get: function() {
      return sdk_info_1.SDK_INFO;
    } });
  }
});

// node_modules/@opentelemetry/core/build/src/platform/index.js
var require_platform = __commonJS({
  "node_modules/@opentelemetry/core/build/src/platform/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getStringListFromEnv = exports2.getNumberFromEnv = exports2.getStringFromEnv = exports2.getBooleanFromEnv = exports2.otperformance = exports2._globalThis = exports2.SDK_INFO = void 0;
    var node_1 = require_node();
    Object.defineProperty(exports2, "SDK_INFO", { enumerable: true, get: function() {
      return node_1.SDK_INFO;
    } });
    Object.defineProperty(exports2, "_globalThis", { enumerable: true, get: function() {
      return node_1._globalThis;
    } });
    Object.defineProperty(exports2, "otperformance", { enumerable: true, get: function() {
      return node_1.otperformance;
    } });
    Object.defineProperty(exports2, "getBooleanFromEnv", { enumerable: true, get: function() {
      return node_1.getBooleanFromEnv;
    } });
    Object.defineProperty(exports2, "getStringFromEnv", { enumerable: true, get: function() {
      return node_1.getStringFromEnv;
    } });
    Object.defineProperty(exports2, "getNumberFromEnv", { enumerable: true, get: function() {
      return node_1.getNumberFromEnv;
    } });
    Object.defineProperty(exports2, "getStringListFromEnv", { enumerable: true, get: function() {
      return node_1.getStringListFromEnv;
    } });
  }
});

// node_modules/@opentelemetry/core/build/src/common/time.js
var require_time = __commonJS({
  "node_modules/@opentelemetry/core/build/src/common/time.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.addHrTimes = exports2.isTimeInput = exports2.isTimeInputHrTime = exports2.hrTimeToMicroseconds = exports2.hrTimeToMilliseconds = exports2.hrTimeToNanoseconds = exports2.hrTimeToTimeStamp = exports2.hrTimeDuration = exports2.timeInputToHrTime = exports2.hrTime = exports2.getTimeOrigin = exports2.millisToHrTime = void 0;
    var platform_1 = require_platform();
    var NANOSECOND_DIGITS = 9;
    var NANOSECOND_DIGITS_IN_MILLIS = 6;
    var MILLISECONDS_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS_IN_MILLIS);
    var SECOND_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS);
    function millisToHrTime(epochMillis) {
      const epochSeconds = epochMillis / 1e3;
      const seconds = Math.trunc(epochSeconds);
      const nanos = Math.round(epochMillis % 1e3 * MILLISECONDS_TO_NANOSECONDS);
      return [seconds, nanos];
    }
    exports2.millisToHrTime = millisToHrTime;
    function getTimeOrigin() {
      let timeOrigin = platform_1.otperformance.timeOrigin;
      if (typeof timeOrigin !== "number") {
        const perf = platform_1.otperformance;
        timeOrigin = perf.timing && perf.timing.fetchStart;
      }
      return timeOrigin;
    }
    exports2.getTimeOrigin = getTimeOrigin;
    function hrTime(performanceNow) {
      const timeOrigin = millisToHrTime(getTimeOrigin());
      const now = millisToHrTime(typeof performanceNow === "number" ? performanceNow : platform_1.otperformance.now());
      return addHrTimes(timeOrigin, now);
    }
    exports2.hrTime = hrTime;
    function timeInputToHrTime(time) {
      if (isTimeInputHrTime(time)) {
        return time;
      } else if (typeof time === "number") {
        if (time < getTimeOrigin()) {
          return hrTime(time);
        } else {
          return millisToHrTime(time);
        }
      } else if (time instanceof Date) {
        return millisToHrTime(time.getTime());
      } else {
        throw TypeError("Invalid input type");
      }
    }
    exports2.timeInputToHrTime = timeInputToHrTime;
    function hrTimeDuration(startTime, endTime) {
      let seconds = endTime[0] - startTime[0];
      let nanos = endTime[1] - startTime[1];
      if (nanos < 0) {
        seconds -= 1;
        nanos += SECOND_TO_NANOSECONDS;
      }
      return [seconds, nanos];
    }
    exports2.hrTimeDuration = hrTimeDuration;
    function hrTimeToTimeStamp(time) {
      const precision = NANOSECOND_DIGITS;
      const tmp = `${"0".repeat(precision)}${time[1]}Z`;
      const nanoString = tmp.substring(tmp.length - precision - 1);
      const date = new Date(time[0] * 1e3).toISOString();
      return date.replace("000Z", nanoString);
    }
    exports2.hrTimeToTimeStamp = hrTimeToTimeStamp;
    function hrTimeToNanoseconds(time) {
      return time[0] * SECOND_TO_NANOSECONDS + time[1];
    }
    exports2.hrTimeToNanoseconds = hrTimeToNanoseconds;
    function hrTimeToMilliseconds(time) {
      return time[0] * 1e3 + time[1] / 1e6;
    }
    exports2.hrTimeToMilliseconds = hrTimeToMilliseconds;
    function hrTimeToMicroseconds(time) {
      return time[0] * 1e6 + time[1] / 1e3;
    }
    exports2.hrTimeToMicroseconds = hrTimeToMicroseconds;
    function isTimeInputHrTime(value) {
      return Array.isArray(value) && value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number";
    }
    exports2.isTimeInputHrTime = isTimeInputHrTime;
    function isTimeInput(value) {
      return isTimeInputHrTime(value) || typeof value === "number" || value instanceof Date;
    }
    exports2.isTimeInput = isTimeInput;
    function addHrTimes(time1, time2) {
      const out = [time1[0] + time2[0], time1[1] + time2[1]];
      if (out[1] >= SECOND_TO_NANOSECONDS) {
        out[1] -= SECOND_TO_NANOSECONDS;
        out[0] += 1;
      }
      return out;
    }
    exports2.addHrTimes = addHrTimes;
  }
});

// node_modules/@opentelemetry/core/build/src/common/timer-util.js
var require_timer_util = __commonJS({
  "node_modules/@opentelemetry/core/build/src/common/timer-util.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.unrefTimer = void 0;
    function unrefTimer(timer) {
      if (typeof timer !== "number") {
        timer.unref();
      }
    }
    exports2.unrefTimer = unrefTimer;
  }
});

// node_modules/@opentelemetry/core/build/src/ExportResult.js
var require_ExportResult = __commonJS({
  "node_modules/@opentelemetry/core/build/src/ExportResult.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ExportResultCode = void 0;
    var ExportResultCode;
    (function(ExportResultCode2) {
      ExportResultCode2[ExportResultCode2["SUCCESS"] = 0] = "SUCCESS";
      ExportResultCode2[ExportResultCode2["FAILED"] = 1] = "FAILED";
    })(ExportResultCode = exports2.ExportResultCode || (exports2.ExportResultCode = {}));
  }
});

// node_modules/@opentelemetry/core/build/src/propagation/composite.js
var require_composite = __commonJS({
  "node_modules/@opentelemetry/core/build/src/propagation/composite.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CompositePropagator = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var CompositePropagator = class {
      _propagators;
      _fields;
      /**
       * Construct a composite propagator from a list of propagators.
       *
       * @param [config] Configuration object for composite propagator
       */
      constructor(config = {}) {
        this._propagators = config.propagators ?? [];
        this._fields = Array.from(new Set(this._propagators.map((p) => typeof p.fields === "function" ? p.fields() : []).reduce((x, y) => x.concat(y), [])));
      }
      /**
       * Run each of the configured propagators with the given context and carrier.
       * Propagators are run in the order they are configured, so if multiple
       * propagators write the same carrier key, the propagator later in the list
       * will "win".
       *
       * @param context Context to inject
       * @param carrier Carrier into which context will be injected
       */
      inject(context2, carrier, setter) {
        for (const propagator of this._propagators) {
          try {
            propagator.inject(context2, carrier, setter);
          } catch (err) {
            api_1.diag.warn(`Failed to inject with ${propagator.constructor.name}. Err: ${err.message}`);
          }
        }
      }
      /**
       * Run each of the configured propagators with the given context and carrier.
       * Propagators are run in the order they are configured, so if multiple
       * propagators write the same context key, the propagator later in the list
       * will "win".
       *
       * @param context Context to add values to
       * @param carrier Carrier from which to extract context
       */
      extract(context2, carrier, getter) {
        return this._propagators.reduce((ctx, propagator) => {
          try {
            return propagator.extract(ctx, carrier, getter);
          } catch (err) {
            api_1.diag.warn(`Failed to extract with ${propagator.constructor.name}. Err: ${err.message}`);
          }
          return ctx;
        }, context2);
      }
      fields() {
        return this._fields.slice();
      }
    };
    exports2.CompositePropagator = CompositePropagator;
  }
});

// node_modules/@opentelemetry/core/build/src/internal/validators.js
var require_validators = __commonJS({
  "node_modules/@opentelemetry/core/build/src/internal/validators.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateValue = exports2.validateKey = void 0;
    var VALID_KEY_CHAR_RANGE2 = "[_0-9a-z-*/]";
    var VALID_KEY2 = `[a-z]${VALID_KEY_CHAR_RANGE2}{0,255}`;
    var VALID_VENDOR_KEY2 = `[a-z0-9]${VALID_KEY_CHAR_RANGE2}{0,240}@[a-z]${VALID_KEY_CHAR_RANGE2}{0,13}`;
    var VALID_KEY_REGEX2 = new RegExp(`^(?:${VALID_KEY2}|${VALID_VENDOR_KEY2})$`);
    var VALID_VALUE_BASE_REGEX2 = /^[ -~]{0,255}[!-~]$/;
    var INVALID_VALUE_COMMA_EQUAL_REGEX2 = /,|=/;
    function validateKey2(key) {
      return VALID_KEY_REGEX2.test(key);
    }
    exports2.validateKey = validateKey2;
    function validateValue2(value) {
      return VALID_VALUE_BASE_REGEX2.test(value) && !INVALID_VALUE_COMMA_EQUAL_REGEX2.test(value);
    }
    exports2.validateValue = validateValue2;
  }
});

// node_modules/@opentelemetry/core/build/src/trace/TraceState.js
var require_TraceState = __commonJS({
  "node_modules/@opentelemetry/core/build/src/trace/TraceState.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TraceState = void 0;
    var validators_1 = require_validators();
    var MAX_TRACE_STATE_ITEMS2 = 32;
    var MAX_TRACE_STATE_LEN2 = 512;
    var LIST_MEMBERS_SEPARATOR2 = ",";
    var LIST_MEMBER_KEY_VALUE_SPLITTER2 = "=";
    var TraceState = class _TraceState {
      _internalState = /* @__PURE__ */ new Map();
      constructor(rawTraceState) {
        if (rawTraceState)
          this._parse(rawTraceState);
      }
      set(key, value) {
        const traceState = this._clone();
        if (traceState._internalState.has(key)) {
          traceState._internalState.delete(key);
        }
        traceState._internalState.set(key, value);
        return traceState;
      }
      unset(key) {
        const traceState = this._clone();
        traceState._internalState.delete(key);
        return traceState;
      }
      get(key) {
        return this._internalState.get(key);
      }
      serialize() {
        return this._keys().reduce((agg, key) => {
          agg.push(key + LIST_MEMBER_KEY_VALUE_SPLITTER2 + this.get(key));
          return agg;
        }, []).join(LIST_MEMBERS_SEPARATOR2);
      }
      _parse(rawTraceState) {
        if (rawTraceState.length > MAX_TRACE_STATE_LEN2)
          return;
        this._internalState = rawTraceState.split(LIST_MEMBERS_SEPARATOR2).reverse().reduce((agg, part) => {
          const listMember = part.trim();
          const i = listMember.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER2);
          if (i !== -1) {
            const key = listMember.slice(0, i);
            const value = listMember.slice(i + 1, part.length);
            if ((0, validators_1.validateKey)(key) && (0, validators_1.validateValue)(value)) {
              agg.set(key, value);
            } else {
            }
          }
          return agg;
        }, /* @__PURE__ */ new Map());
        if (this._internalState.size > MAX_TRACE_STATE_ITEMS2) {
          this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, MAX_TRACE_STATE_ITEMS2));
        }
      }
      _keys() {
        return Array.from(this._internalState.keys()).reverse();
      }
      _clone() {
        const traceState = new _TraceState();
        traceState._internalState = new Map(this._internalState);
        return traceState;
      }
    };
    exports2.TraceState = TraceState;
  }
});

// node_modules/@opentelemetry/core/build/src/trace/W3CTraceContextPropagator.js
var require_W3CTraceContextPropagator = __commonJS({
  "node_modules/@opentelemetry/core/build/src/trace/W3CTraceContextPropagator.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.W3CTraceContextPropagator = exports2.parseTraceParent = exports2.TRACE_STATE_HEADER = exports2.TRACE_PARENT_HEADER = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var suppress_tracing_1 = require_suppress_tracing();
    var TraceState_1 = require_TraceState();
    exports2.TRACE_PARENT_HEADER = "traceparent";
    exports2.TRACE_STATE_HEADER = "tracestate";
    var VERSION2 = "00";
    var VERSION_PART = "(?!ff)[\\da-f]{2}";
    var TRACE_ID_PART = "(?![0]{32})[\\da-f]{32}";
    var PARENT_ID_PART = "(?![0]{16})[\\da-f]{16}";
    var FLAGS_PART = "[\\da-f]{2}";
    var TRACE_PARENT_REGEX = new RegExp(`^\\s?(${VERSION_PART})-(${TRACE_ID_PART})-(${PARENT_ID_PART})-(${FLAGS_PART})(-.*)?\\s?$`);
    function parseTraceParent(traceParent) {
      const match = TRACE_PARENT_REGEX.exec(traceParent);
      if (!match)
        return null;
      if (match[1] === "00" && match[5])
        return null;
      return {
        traceId: match[2],
        spanId: match[3],
        traceFlags: parseInt(match[4], 16)
      };
    }
    exports2.parseTraceParent = parseTraceParent;
    var W3CTraceContextPropagator = class {
      inject(context2, carrier, setter) {
        const spanContext = api_1.trace.getSpanContext(context2);
        if (!spanContext || (0, suppress_tracing_1.isTracingSuppressed)(context2) || !(0, api_1.isSpanContextValid)(spanContext))
          return;
        const traceParent = `${VERSION2}-${spanContext.traceId}-${spanContext.spanId}-0${Number(spanContext.traceFlags || api_1.TraceFlags.NONE).toString(16)}`;
        setter.set(carrier, exports2.TRACE_PARENT_HEADER, traceParent);
        if (spanContext.traceState) {
          setter.set(carrier, exports2.TRACE_STATE_HEADER, spanContext.traceState.serialize());
        }
      }
      extract(context2, carrier, getter) {
        const traceParentHeader = getter.get(carrier, exports2.TRACE_PARENT_HEADER);
        if (!traceParentHeader)
          return context2;
        const traceParent = Array.isArray(traceParentHeader) ? traceParentHeader[0] : traceParentHeader;
        if (typeof traceParent !== "string")
          return context2;
        const spanContext = parseTraceParent(traceParent);
        if (!spanContext)
          return context2;
        spanContext.isRemote = true;
        const traceStateHeader = getter.get(carrier, exports2.TRACE_STATE_HEADER);
        if (traceStateHeader) {
          const state = Array.isArray(traceStateHeader) ? traceStateHeader.join(",") : traceStateHeader;
          spanContext.traceState = new TraceState_1.TraceState(typeof state === "string" ? state : void 0);
        }
        return api_1.trace.setSpanContext(context2, spanContext);
      }
      fields() {
        return [exports2.TRACE_PARENT_HEADER, exports2.TRACE_STATE_HEADER];
      }
    };
    exports2.W3CTraceContextPropagator = W3CTraceContextPropagator;
  }
});

// node_modules/@opentelemetry/core/build/src/trace/rpc-metadata.js
var require_rpc_metadata = __commonJS({
  "node_modules/@opentelemetry/core/build/src/trace/rpc-metadata.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getRPCMetadata = exports2.deleteRPCMetadata = exports2.setRPCMetadata = exports2.RPCType = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var RPC_METADATA_KEY = (0, api_1.createContextKey)("OpenTelemetry SDK Context Key RPC_METADATA");
    var RPCType;
    (function(RPCType2) {
      RPCType2["HTTP"] = "http";
    })(RPCType = exports2.RPCType || (exports2.RPCType = {}));
    function setRPCMetadata(context2, meta) {
      return context2.setValue(RPC_METADATA_KEY, meta);
    }
    exports2.setRPCMetadata = setRPCMetadata;
    function deleteRPCMetadata(context2) {
      return context2.deleteValue(RPC_METADATA_KEY);
    }
    exports2.deleteRPCMetadata = deleteRPCMetadata;
    function getRPCMetadata(context2) {
      return context2.getValue(RPC_METADATA_KEY);
    }
    exports2.getRPCMetadata = getRPCMetadata;
  }
});

// node_modules/@opentelemetry/core/build/src/utils/lodash.merge.js
var require_lodash_merge = __commonJS({
  "node_modules/@opentelemetry/core/build/src/utils/lodash.merge.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isPlainObject = void 0;
    var objectTag = "[object Object]";
    var nullTag = "[object Null]";
    var undefinedTag = "[object Undefined]";
    var funcProto = Function.prototype;
    var funcToString = funcProto.toString;
    var objectCtorString = funcToString.call(Object);
    var getPrototypeOf = Object.getPrototypeOf;
    var objectProto = Object.prototype;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var symToStringTag = Symbol ? Symbol.toStringTag : void 0;
    var nativeObjectToString = objectProto.toString;
    function isPlainObject(value) {
      if (!isObjectLike(value) || baseGetTag(value) !== objectTag) {
        return false;
      }
      const proto = getPrototypeOf(value);
      if (proto === null) {
        return true;
      }
      const Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
      return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) === objectCtorString;
    }
    exports2.isPlainObject = isPlainObject;
    function isObjectLike(value) {
      return value != null && typeof value == "object";
    }
    function baseGetTag(value) {
      if (value == null) {
        return value === void 0 ? undefinedTag : nullTag;
      }
      return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
    }
    function getRawTag(value) {
      const isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
      let unmasked = false;
      try {
        value[symToStringTag] = void 0;
        unmasked = true;
      } catch {
      }
      const result = nativeObjectToString.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag] = tag;
        } else {
          delete value[symToStringTag];
        }
      }
      return result;
    }
    function objectToString(value) {
      return nativeObjectToString.call(value);
    }
  }
});

// node_modules/@opentelemetry/core/build/src/utils/merge.js
var require_merge = __commonJS({
  "node_modules/@opentelemetry/core/build/src/utils/merge.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.merge = void 0;
    var lodash_merge_1 = require_lodash_merge();
    var MAX_LEVEL = 20;
    function merge(...args) {
      let result = args.shift();
      const objects = /* @__PURE__ */ new WeakMap();
      while (args.length > 0) {
        result = mergeTwoObjects(result, args.shift(), 0, objects);
      }
      return result;
    }
    exports2.merge = merge;
    function takeValue(value) {
      if (isArray(value)) {
        return value.slice();
      }
      return value;
    }
    function mergeTwoObjects(one, two, level = 0, objects) {
      let result;
      if (level > MAX_LEVEL) {
        return void 0;
      }
      level++;
      if (isPrimitive(one) || isPrimitive(two) || isFunction(two)) {
        result = takeValue(two);
      } else if (isArray(one)) {
        result = one.slice();
        if (isArray(two)) {
          for (let i = 0, j = two.length; i < j; i++) {
            result.push(takeValue(two[i]));
          }
        } else if (isObject(two)) {
          const keys = Object.keys(two);
          for (let i = 0, j = keys.length; i < j; i++) {
            const key = keys[i];
            result[key] = takeValue(two[key]);
          }
        }
      } else if (isObject(one)) {
        if (isObject(two)) {
          if (!shouldMerge(one, two)) {
            return two;
          }
          result = Object.assign({}, one);
          const keys = Object.keys(two);
          for (let i = 0, j = keys.length; i < j; i++) {
            const key = keys[i];
            const twoValue = two[key];
            if (isPrimitive(twoValue)) {
              if (typeof twoValue === "undefined") {
                delete result[key];
              } else {
                result[key] = twoValue;
              }
            } else {
              const obj1 = result[key];
              const obj2 = twoValue;
              if (wasObjectReferenced(one, key, objects) || wasObjectReferenced(two, key, objects)) {
                delete result[key];
              } else {
                if (isObject(obj1) && isObject(obj2)) {
                  const arr1 = objects.get(obj1) || [];
                  const arr2 = objects.get(obj2) || [];
                  arr1.push({ obj: one, key });
                  arr2.push({ obj: two, key });
                  objects.set(obj1, arr1);
                  objects.set(obj2, arr2);
                }
                result[key] = mergeTwoObjects(result[key], twoValue, level, objects);
              }
            }
          }
        } else {
          result = two;
        }
      }
      return result;
    }
    function wasObjectReferenced(obj, key, objects) {
      const arr = objects.get(obj[key]) || [];
      for (let i = 0, j = arr.length; i < j; i++) {
        const info = arr[i];
        if (info.key === key && info.obj === obj) {
          return true;
        }
      }
      return false;
    }
    function isArray(value) {
      return Array.isArray(value);
    }
    function isFunction(value) {
      return typeof value === "function";
    }
    function isObject(value) {
      return !isPrimitive(value) && !isArray(value) && !isFunction(value) && typeof value === "object";
    }
    function isPrimitive(value) {
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "undefined" || value instanceof Date || value instanceof RegExp || value === null;
    }
    function shouldMerge(one, two) {
      if (!(0, lodash_merge_1.isPlainObject)(one) || !(0, lodash_merge_1.isPlainObject)(two)) {
        return false;
      }
      return true;
    }
  }
});

// node_modules/@opentelemetry/core/build/src/utils/timeout.js
var require_timeout = __commonJS({
  "node_modules/@opentelemetry/core/build/src/utils/timeout.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.callWithTimeout = exports2.TimeoutError = void 0;
    var TimeoutError = class _TimeoutError extends Error {
      constructor(message) {
        super(message);
        Object.setPrototypeOf(this, _TimeoutError.prototype);
      }
    };
    exports2.TimeoutError = TimeoutError;
    function callWithTimeout(promise, timeout) {
      let timeoutHandle;
      const timeoutPromise = new Promise(function timeoutFunction(_resolve, reject) {
        timeoutHandle = setTimeout(function timeoutHandler() {
          reject(new TimeoutError("Operation timed out."));
        }, timeout);
      });
      return Promise.race([promise, timeoutPromise]).then((result) => {
        clearTimeout(timeoutHandle);
        return result;
      }, (reason) => {
        clearTimeout(timeoutHandle);
        throw reason;
      });
    }
    exports2.callWithTimeout = callWithTimeout;
  }
});

// node_modules/@opentelemetry/core/build/src/utils/url.js
var require_url = __commonJS({
  "node_modules/@opentelemetry/core/build/src/utils/url.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isUrlIgnored = exports2.urlMatches = void 0;
    function urlMatches(url, urlToMatch) {
      if (typeof urlToMatch === "string") {
        return url === urlToMatch;
      } else {
        return !!url.match(urlToMatch);
      }
    }
    exports2.urlMatches = urlMatches;
    function isUrlIgnored(url, ignoredUrls) {
      if (!ignoredUrls) {
        return false;
      }
      for (const ignoreUrl of ignoredUrls) {
        if (urlMatches(url, ignoreUrl)) {
          return true;
        }
      }
      return false;
    }
    exports2.isUrlIgnored = isUrlIgnored;
  }
});

// node_modules/@opentelemetry/core/build/src/utils/promise.js
var require_promise = __commonJS({
  "node_modules/@opentelemetry/core/build/src/utils/promise.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Deferred = void 0;
    var Deferred = class {
      _promise;
      _resolve;
      _reject;
      constructor() {
        this._promise = new Promise((resolve, reject) => {
          this._resolve = resolve;
          this._reject = reject;
        });
      }
      get promise() {
        return this._promise;
      }
      resolve(val) {
        this._resolve(val);
      }
      reject(err) {
        this._reject(err);
      }
    };
    exports2.Deferred = Deferred;
  }
});

// node_modules/@opentelemetry/core/build/src/utils/callback.js
var require_callback = __commonJS({
  "node_modules/@opentelemetry/core/build/src/utils/callback.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BindOnceFuture = void 0;
    var promise_1 = require_promise();
    var BindOnceFuture = class {
      _callback;
      _that;
      _isCalled = false;
      _deferred = new promise_1.Deferred();
      constructor(_callback, _that) {
        this._callback = _callback;
        this._that = _that;
      }
      get isCalled() {
        return this._isCalled;
      }
      get promise() {
        return this._deferred.promise;
      }
      call(...args) {
        if (!this._isCalled) {
          this._isCalled = true;
          try {
            Promise.resolve(this._callback.call(this._that, ...args)).then((val) => this._deferred.resolve(val), (err) => this._deferred.reject(err));
          } catch (err) {
            this._deferred.reject(err);
          }
        }
        return this._deferred.promise;
      }
    };
    exports2.BindOnceFuture = BindOnceFuture;
  }
});

// node_modules/@opentelemetry/core/build/src/utils/configuration.js
var require_configuration = __commonJS({
  "node_modules/@opentelemetry/core/build/src/utils/configuration.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.diagLogLevelFromString = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var logLevelMap = {
      ALL: api_1.DiagLogLevel.ALL,
      VERBOSE: api_1.DiagLogLevel.VERBOSE,
      DEBUG: api_1.DiagLogLevel.DEBUG,
      INFO: api_1.DiagLogLevel.INFO,
      WARN: api_1.DiagLogLevel.WARN,
      ERROR: api_1.DiagLogLevel.ERROR,
      NONE: api_1.DiagLogLevel.NONE
    };
    function diagLogLevelFromString(value) {
      if (value == null) {
        return void 0;
      }
      const resolvedLogLevel = logLevelMap[value.toUpperCase()];
      if (resolvedLogLevel == null) {
        api_1.diag.warn(`Unknown log level "${value}", expected one of ${Object.keys(logLevelMap)}, using default`);
        return api_1.DiagLogLevel.INFO;
      }
      return resolvedLogLevel;
    }
    exports2.diagLogLevelFromString = diagLogLevelFromString;
  }
});

// node_modules/@opentelemetry/core/build/src/internal/exporter.js
var require_exporter = __commonJS({
  "node_modules/@opentelemetry/core/build/src/internal/exporter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2._export = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var suppress_tracing_1 = require_suppress_tracing();
    function _export(exporter, arg) {
      return new Promise((resolve) => {
        api_1.context.with((0, suppress_tracing_1.suppressTracing)(api_1.context.active()), () => {
          exporter.export(arg, (result) => {
            resolve(result);
          });
        });
      });
    }
    exports2._export = _export;
  }
});

// node_modules/@opentelemetry/core/build/src/index.js
var require_src = __commonJS({
  "node_modules/@opentelemetry/core/build/src/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.internal = exports2.diagLogLevelFromString = exports2.BindOnceFuture = exports2.urlMatches = exports2.isUrlIgnored = exports2.callWithTimeout = exports2.TimeoutError = exports2.merge = exports2.TraceState = exports2.unsuppressTracing = exports2.suppressTracing = exports2.isTracingSuppressed = exports2.setRPCMetadata = exports2.getRPCMetadata = exports2.deleteRPCMetadata = exports2.RPCType = exports2.parseTraceParent = exports2.W3CTraceContextPropagator = exports2.TRACE_STATE_HEADER = exports2.TRACE_PARENT_HEADER = exports2.CompositePropagator = exports2.otperformance = exports2.getStringListFromEnv = exports2.getNumberFromEnv = exports2.getBooleanFromEnv = exports2.getStringFromEnv = exports2._globalThis = exports2.SDK_INFO = exports2.parseKeyPairsIntoRecord = exports2.ExportResultCode = exports2.unrefTimer = exports2.timeInputToHrTime = exports2.millisToHrTime = exports2.isTimeInputHrTime = exports2.isTimeInput = exports2.hrTimeToTimeStamp = exports2.hrTimeToNanoseconds = exports2.hrTimeToMilliseconds = exports2.hrTimeToMicroseconds = exports2.hrTimeDuration = exports2.hrTime = exports2.getTimeOrigin = exports2.addHrTimes = exports2.loggingErrorHandler = exports2.setGlobalErrorHandler = exports2.globalErrorHandler = exports2.sanitizeAttributes = exports2.isAttributeValue = exports2.AnchoredClock = exports2.W3CBaggagePropagator = void 0;
    var W3CBaggagePropagator_1 = require_W3CBaggagePropagator();
    Object.defineProperty(exports2, "W3CBaggagePropagator", { enumerable: true, get: function() {
      return W3CBaggagePropagator_1.W3CBaggagePropagator;
    } });
    var anchored_clock_1 = require_anchored_clock();
    Object.defineProperty(exports2, "AnchoredClock", { enumerable: true, get: function() {
      return anchored_clock_1.AnchoredClock;
    } });
    var attributes_1 = require_attributes();
    Object.defineProperty(exports2, "isAttributeValue", { enumerable: true, get: function() {
      return attributes_1.isAttributeValue;
    } });
    Object.defineProperty(exports2, "sanitizeAttributes", { enumerable: true, get: function() {
      return attributes_1.sanitizeAttributes;
    } });
    var global_error_handler_1 = require_global_error_handler();
    Object.defineProperty(exports2, "globalErrorHandler", { enumerable: true, get: function() {
      return global_error_handler_1.globalErrorHandler;
    } });
    Object.defineProperty(exports2, "setGlobalErrorHandler", { enumerable: true, get: function() {
      return global_error_handler_1.setGlobalErrorHandler;
    } });
    var logging_error_handler_1 = require_logging_error_handler();
    Object.defineProperty(exports2, "loggingErrorHandler", { enumerable: true, get: function() {
      return logging_error_handler_1.loggingErrorHandler;
    } });
    var time_1 = require_time();
    Object.defineProperty(exports2, "addHrTimes", { enumerable: true, get: function() {
      return time_1.addHrTimes;
    } });
    Object.defineProperty(exports2, "getTimeOrigin", { enumerable: true, get: function() {
      return time_1.getTimeOrigin;
    } });
    Object.defineProperty(exports2, "hrTime", { enumerable: true, get: function() {
      return time_1.hrTime;
    } });
    Object.defineProperty(exports2, "hrTimeDuration", { enumerable: true, get: function() {
      return time_1.hrTimeDuration;
    } });
    Object.defineProperty(exports2, "hrTimeToMicroseconds", { enumerable: true, get: function() {
      return time_1.hrTimeToMicroseconds;
    } });
    Object.defineProperty(exports2, "hrTimeToMilliseconds", { enumerable: true, get: function() {
      return time_1.hrTimeToMilliseconds;
    } });
    Object.defineProperty(exports2, "hrTimeToNanoseconds", { enumerable: true, get: function() {
      return time_1.hrTimeToNanoseconds;
    } });
    Object.defineProperty(exports2, "hrTimeToTimeStamp", { enumerable: true, get: function() {
      return time_1.hrTimeToTimeStamp;
    } });
    Object.defineProperty(exports2, "isTimeInput", { enumerable: true, get: function() {
      return time_1.isTimeInput;
    } });
    Object.defineProperty(exports2, "isTimeInputHrTime", { enumerable: true, get: function() {
      return time_1.isTimeInputHrTime;
    } });
    Object.defineProperty(exports2, "millisToHrTime", { enumerable: true, get: function() {
      return time_1.millisToHrTime;
    } });
    Object.defineProperty(exports2, "timeInputToHrTime", { enumerable: true, get: function() {
      return time_1.timeInputToHrTime;
    } });
    var timer_util_1 = require_timer_util();
    Object.defineProperty(exports2, "unrefTimer", { enumerable: true, get: function() {
      return timer_util_1.unrefTimer;
    } });
    var ExportResult_1 = require_ExportResult();
    Object.defineProperty(exports2, "ExportResultCode", { enumerable: true, get: function() {
      return ExportResult_1.ExportResultCode;
    } });
    var utils_1 = require_utils();
    Object.defineProperty(exports2, "parseKeyPairsIntoRecord", { enumerable: true, get: function() {
      return utils_1.parseKeyPairsIntoRecord;
    } });
    var platform_1 = require_platform();
    Object.defineProperty(exports2, "SDK_INFO", { enumerable: true, get: function() {
      return platform_1.SDK_INFO;
    } });
    Object.defineProperty(exports2, "_globalThis", { enumerable: true, get: function() {
      return platform_1._globalThis;
    } });
    Object.defineProperty(exports2, "getStringFromEnv", { enumerable: true, get: function() {
      return platform_1.getStringFromEnv;
    } });
    Object.defineProperty(exports2, "getBooleanFromEnv", { enumerable: true, get: function() {
      return platform_1.getBooleanFromEnv;
    } });
    Object.defineProperty(exports2, "getNumberFromEnv", { enumerable: true, get: function() {
      return platform_1.getNumberFromEnv;
    } });
    Object.defineProperty(exports2, "getStringListFromEnv", { enumerable: true, get: function() {
      return platform_1.getStringListFromEnv;
    } });
    Object.defineProperty(exports2, "otperformance", { enumerable: true, get: function() {
      return platform_1.otperformance;
    } });
    var composite_1 = require_composite();
    Object.defineProperty(exports2, "CompositePropagator", { enumerable: true, get: function() {
      return composite_1.CompositePropagator;
    } });
    var W3CTraceContextPropagator_1 = require_W3CTraceContextPropagator();
    Object.defineProperty(exports2, "TRACE_PARENT_HEADER", { enumerable: true, get: function() {
      return W3CTraceContextPropagator_1.TRACE_PARENT_HEADER;
    } });
    Object.defineProperty(exports2, "TRACE_STATE_HEADER", { enumerable: true, get: function() {
      return W3CTraceContextPropagator_1.TRACE_STATE_HEADER;
    } });
    Object.defineProperty(exports2, "W3CTraceContextPropagator", { enumerable: true, get: function() {
      return W3CTraceContextPropagator_1.W3CTraceContextPropagator;
    } });
    Object.defineProperty(exports2, "parseTraceParent", { enumerable: true, get: function() {
      return W3CTraceContextPropagator_1.parseTraceParent;
    } });
    var rpc_metadata_1 = require_rpc_metadata();
    Object.defineProperty(exports2, "RPCType", { enumerable: true, get: function() {
      return rpc_metadata_1.RPCType;
    } });
    Object.defineProperty(exports2, "deleteRPCMetadata", { enumerable: true, get: function() {
      return rpc_metadata_1.deleteRPCMetadata;
    } });
    Object.defineProperty(exports2, "getRPCMetadata", { enumerable: true, get: function() {
      return rpc_metadata_1.getRPCMetadata;
    } });
    Object.defineProperty(exports2, "setRPCMetadata", { enumerable: true, get: function() {
      return rpc_metadata_1.setRPCMetadata;
    } });
    var suppress_tracing_1 = require_suppress_tracing();
    Object.defineProperty(exports2, "isTracingSuppressed", { enumerable: true, get: function() {
      return suppress_tracing_1.isTracingSuppressed;
    } });
    Object.defineProperty(exports2, "suppressTracing", { enumerable: true, get: function() {
      return suppress_tracing_1.suppressTracing;
    } });
    Object.defineProperty(exports2, "unsuppressTracing", { enumerable: true, get: function() {
      return suppress_tracing_1.unsuppressTracing;
    } });
    var TraceState_1 = require_TraceState();
    Object.defineProperty(exports2, "TraceState", { enumerable: true, get: function() {
      return TraceState_1.TraceState;
    } });
    var merge_1 = require_merge();
    Object.defineProperty(exports2, "merge", { enumerable: true, get: function() {
      return merge_1.merge;
    } });
    var timeout_1 = require_timeout();
    Object.defineProperty(exports2, "TimeoutError", { enumerable: true, get: function() {
      return timeout_1.TimeoutError;
    } });
    Object.defineProperty(exports2, "callWithTimeout", { enumerable: true, get: function() {
      return timeout_1.callWithTimeout;
    } });
    var url_1 = require_url();
    Object.defineProperty(exports2, "isUrlIgnored", { enumerable: true, get: function() {
      return url_1.isUrlIgnored;
    } });
    Object.defineProperty(exports2, "urlMatches", { enumerable: true, get: function() {
      return url_1.urlMatches;
    } });
    var callback_1 = require_callback();
    Object.defineProperty(exports2, "BindOnceFuture", { enumerable: true, get: function() {
      return callback_1.BindOnceFuture;
    } });
    var configuration_1 = require_configuration();
    Object.defineProperty(exports2, "diagLogLevelFromString", { enumerable: true, get: function() {
      return configuration_1.diagLogLevelFromString;
    } });
    var exporter_1 = require_exporter();
    exports2.internal = {
      _export: exporter_1._export
    };
  }
});

// node_modules/@opentelemetry/resources/build/src/platform/node/default-service-name.js
var require_default_service_name = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/platform/node/default-service-name.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultServiceName = void 0;
    function defaultServiceName() {
      return `unknown_service:${process.argv0}`;
    }
    exports2.defaultServiceName = defaultServiceName;
  }
});

// node_modules/@opentelemetry/resources/build/src/platform/node/index.js
var require_node2 = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/platform/node/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultServiceName = void 0;
    var default_service_name_1 = require_default_service_name();
    Object.defineProperty(exports2, "defaultServiceName", { enumerable: true, get: function() {
      return default_service_name_1.defaultServiceName;
    } });
  }
});

// node_modules/@opentelemetry/resources/build/src/platform/index.js
var require_platform2 = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/platform/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultServiceName = void 0;
    var node_1 = require_node2();
    Object.defineProperty(exports2, "defaultServiceName", { enumerable: true, get: function() {
      return node_1.defaultServiceName;
    } });
  }
});

// node_modules/@opentelemetry/resources/build/src/utils.js
var require_utils2 = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.identity = exports2.isPromiseLike = void 0;
    var isPromiseLike = (val) => {
      return val !== null && typeof val === "object" && typeof val.then === "function";
    };
    exports2.isPromiseLike = isPromiseLike;
    function identity(_) {
      return _;
    }
    exports2.identity = identity;
  }
});

// node_modules/@opentelemetry/resources/build/src/ResourceImpl.js
var require_ResourceImpl = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/ResourceImpl.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultResource = exports2.emptyResource = exports2.resourceFromDetectedResource = exports2.resourceFromAttributes = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var core_1 = require_src();
    var semantic_conventions_1 = (init_esm2(), __toCommonJS(esm_exports2));
    var platform_1 = require_platform2();
    var utils_1 = require_utils2();
    var ResourceImpl = class _ResourceImpl {
      _rawAttributes;
      _asyncAttributesPending = false;
      _schemaUrl;
      _memoizedAttributes;
      static FromAttributeList(attributes, options) {
        const res = new _ResourceImpl({}, options);
        res._rawAttributes = guardedRawAttributes(attributes);
        res._asyncAttributesPending = attributes.filter(([_, val]) => (0, utils_1.isPromiseLike)(val)).length > 0;
        return res;
      }
      constructor(resource, options) {
        const attributes = resource.attributes ?? {};
        this._rawAttributes = Object.entries(attributes).map(([k, v]) => {
          if ((0, utils_1.isPromiseLike)(v)) {
            this._asyncAttributesPending = true;
          }
          return [k, v];
        });
        this._rawAttributes = guardedRawAttributes(this._rawAttributes);
        this._schemaUrl = validateSchemaUrl(options?.schemaUrl);
      }
      get asyncAttributesPending() {
        return this._asyncAttributesPending;
      }
      async waitForAsyncAttributes() {
        if (!this.asyncAttributesPending) {
          return;
        }
        for (let i = 0; i < this._rawAttributes.length; i++) {
          const [k, v] = this._rawAttributes[i];
          this._rawAttributes[i] = [k, (0, utils_1.isPromiseLike)(v) ? await v : v];
        }
        this._asyncAttributesPending = false;
      }
      get attributes() {
        if (this.asyncAttributesPending) {
          api_1.diag.error("Accessing resource attributes before async attributes settled");
        }
        if (this._memoizedAttributes) {
          return this._memoizedAttributes;
        }
        const attrs = {};
        for (const [k, v] of this._rawAttributes) {
          if ((0, utils_1.isPromiseLike)(v)) {
            api_1.diag.debug(`Unsettled resource attribute ${k} skipped`);
            continue;
          }
          if (v != null) {
            attrs[k] ??= v;
          }
        }
        if (!this._asyncAttributesPending) {
          this._memoizedAttributes = attrs;
        }
        return attrs;
      }
      getRawAttributes() {
        return this._rawAttributes;
      }
      get schemaUrl() {
        return this._schemaUrl;
      }
      merge(resource) {
        if (resource == null)
          return this;
        const mergedSchemaUrl = mergeSchemaUrl(this, resource);
        const mergedOptions = mergedSchemaUrl ? { schemaUrl: mergedSchemaUrl } : void 0;
        return _ResourceImpl.FromAttributeList([...resource.getRawAttributes(), ...this.getRawAttributes()], mergedOptions);
      }
    };
    function resourceFromAttributes(attributes, options) {
      return ResourceImpl.FromAttributeList(Object.entries(attributes), options);
    }
    exports2.resourceFromAttributes = resourceFromAttributes;
    function resourceFromDetectedResource(detectedResource, options) {
      return new ResourceImpl(detectedResource, options);
    }
    exports2.resourceFromDetectedResource = resourceFromDetectedResource;
    function emptyResource() {
      return resourceFromAttributes({});
    }
    exports2.emptyResource = emptyResource;
    function defaultResource() {
      return resourceFromAttributes({
        [semantic_conventions_1.ATTR_SERVICE_NAME]: (0, platform_1.defaultServiceName)(),
        [semantic_conventions_1.ATTR_TELEMETRY_SDK_LANGUAGE]: core_1.SDK_INFO[semantic_conventions_1.ATTR_TELEMETRY_SDK_LANGUAGE],
        [semantic_conventions_1.ATTR_TELEMETRY_SDK_NAME]: core_1.SDK_INFO[semantic_conventions_1.ATTR_TELEMETRY_SDK_NAME],
        [semantic_conventions_1.ATTR_TELEMETRY_SDK_VERSION]: core_1.SDK_INFO[semantic_conventions_1.ATTR_TELEMETRY_SDK_VERSION]
      });
    }
    exports2.defaultResource = defaultResource;
    function guardedRawAttributes(attributes) {
      return attributes.map(([k, v]) => {
        if ((0, utils_1.isPromiseLike)(v)) {
          return [
            k,
            v.catch((err) => {
              api_1.diag.debug("promise rejection for resource attribute: %s - %s", k, err);
              return void 0;
            })
          ];
        }
        return [k, v];
      });
    }
    function validateSchemaUrl(schemaUrl) {
      if (typeof schemaUrl === "string" || schemaUrl === void 0) {
        return schemaUrl;
      }
      api_1.diag.warn("Schema URL must be string or undefined, got %s. Schema URL will be ignored.", schemaUrl);
      return void 0;
    }
    function mergeSchemaUrl(old, updating) {
      const oldSchemaUrl = old?.schemaUrl;
      const updatingSchemaUrl = updating?.schemaUrl;
      const isOldEmpty = oldSchemaUrl === void 0 || oldSchemaUrl === "";
      const isUpdatingEmpty = updatingSchemaUrl === void 0 || updatingSchemaUrl === "";
      if (isOldEmpty) {
        return updatingSchemaUrl;
      }
      if (isUpdatingEmpty) {
        return oldSchemaUrl;
      }
      if (oldSchemaUrl === updatingSchemaUrl) {
        return oldSchemaUrl;
      }
      api_1.diag.warn('Schema URL merge conflict: old resource has "%s", updating resource has "%s". Resulting resource will have undefined Schema URL.', oldSchemaUrl, updatingSchemaUrl);
      return void 0;
    }
  }
});

// node_modules/@opentelemetry/resources/build/src/detect-resources.js
var require_detect_resources = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detect-resources.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.detectResources = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var ResourceImpl_1 = require_ResourceImpl();
    var detectResources = (config = {}) => {
      const resources = (config.detectors || []).map((d) => {
        try {
          const resource = (0, ResourceImpl_1.resourceFromDetectedResource)(d.detect(config));
          api_1.diag.debug(`${d.constructor.name} found resource.`, resource);
          return resource;
        } catch (e) {
          api_1.diag.debug(`${d.constructor.name} failed: ${e.message}`);
          return (0, ResourceImpl_1.emptyResource)();
        }
      });
      return resources.reduce((acc, resource) => acc.merge(resource), (0, ResourceImpl_1.emptyResource)());
    };
    exports2.detectResources = detectResources;
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/EnvDetector.js
var require_EnvDetector = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/EnvDetector.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.envDetector = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var semantic_conventions_1 = (init_esm2(), __toCommonJS(esm_exports2));
    var core_1 = require_src();
    var EnvDetector = class {
      // Type, attribute keys, and attribute values should not exceed 256 characters.
      _MAX_LENGTH = 255;
      // OTEL_RESOURCE_ATTRIBUTES is a comma-separated list of attributes.
      _COMMA_SEPARATOR = ",";
      // OTEL_RESOURCE_ATTRIBUTES contains key value pair separated by '='.
      _LABEL_KEY_VALUE_SPLITTER = "=";
      _ERROR_MESSAGE_INVALID_CHARS = "should be a ASCII string with a length greater than 0 and not exceed " + this._MAX_LENGTH + " characters.";
      _ERROR_MESSAGE_INVALID_VALUE = "should be a ASCII string with a length not exceed " + this._MAX_LENGTH + " characters.";
      /**
       * Returns a {@link Resource} populated with attributes from the
       * OTEL_RESOURCE_ATTRIBUTES environment variable. Note this is an async
       * function to conform to the Detector interface.
       *
       * @param config The resource detection config
       */
      detect(_config) {
        const attributes = {};
        const rawAttributes = (0, core_1.getStringFromEnv)("OTEL_RESOURCE_ATTRIBUTES");
        const serviceName = (0, core_1.getStringFromEnv)("OTEL_SERVICE_NAME");
        if (rawAttributes) {
          try {
            const parsedAttributes = this._parseResourceAttributes(rawAttributes);
            Object.assign(attributes, parsedAttributes);
          } catch (e) {
            api_1.diag.debug(`EnvDetector failed: ${e.message}`);
          }
        }
        if (serviceName) {
          attributes[semantic_conventions_1.ATTR_SERVICE_NAME] = serviceName;
        }
        return { attributes };
      }
      /**
       * Creates an attribute map from the OTEL_RESOURCE_ATTRIBUTES environment
       * variable.
       *
       * OTEL_RESOURCE_ATTRIBUTES: A comma-separated list of attributes describing
       * the source in more detail, e.g. “key1=val1,key2=val2”. Domain names and
       * paths are accepted as attribute keys. Values may be quoted or unquoted in
       * general. If a value contains whitespace, =, or " characters, it must
       * always be quoted.
       *
       * @param rawEnvAttributes The resource attributes as a comma-separated list
       * of key/value pairs.
       * @returns The sanitized resource attributes.
       */
      _parseResourceAttributes(rawEnvAttributes) {
        if (!rawEnvAttributes)
          return {};
        const attributes = {};
        const rawAttributes = rawEnvAttributes.split(this._COMMA_SEPARATOR, -1);
        for (const rawAttribute of rawAttributes) {
          const keyValuePair = rawAttribute.split(this._LABEL_KEY_VALUE_SPLITTER, -1);
          if (keyValuePair.length !== 2) {
            continue;
          }
          let [key, value] = keyValuePair;
          key = key.trim();
          value = value.trim().split(/^"|"$/).join("");
          if (!this._isValidAndNotEmpty(key)) {
            throw new Error(`Attribute key ${this._ERROR_MESSAGE_INVALID_CHARS}`);
          }
          if (!this._isValid(value)) {
            throw new Error(`Attribute value ${this._ERROR_MESSAGE_INVALID_VALUE}`);
          }
          attributes[key] = decodeURIComponent(value);
        }
        return attributes;
      }
      /**
       * Determines whether the given String is a valid printable ASCII string with
       * a length not exceed _MAX_LENGTH characters.
       *
       * @param str The String to be validated.
       * @returns Whether the String is valid.
       */
      _isValid(name) {
        return name.length <= this._MAX_LENGTH && this._isBaggageOctetString(name);
      }
      // https://www.w3.org/TR/baggage/#definition
      _isBaggageOctetString(str) {
        for (let i = 0; i < str.length; i++) {
          const ch = str.charCodeAt(i);
          if (ch < 33 || ch === 44 || ch === 59 || ch === 92 || ch > 126) {
            return false;
          }
        }
        return true;
      }
      /**
       * Determines whether the given String is a valid printable ASCII string with
       * a length greater than 0 and not exceed _MAX_LENGTH characters.
       *
       * @param str The String to be validated.
       * @returns Whether the String is valid and not empty.
       */
      _isValidAndNotEmpty(str) {
        return str.length > 0 && this._isValid(str);
      }
    };
    exports2.envDetector = new EnvDetector();
  }
});

// node_modules/@opentelemetry/resources/build/src/semconv.js
var require_semconv2 = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/semconv.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ATTR_WEBENGINE_VERSION = exports2.ATTR_WEBENGINE_NAME = exports2.ATTR_WEBENGINE_DESCRIPTION = exports2.ATTR_SERVICE_NAMESPACE = exports2.ATTR_SERVICE_INSTANCE_ID = exports2.ATTR_PROCESS_RUNTIME_VERSION = exports2.ATTR_PROCESS_RUNTIME_NAME = exports2.ATTR_PROCESS_RUNTIME_DESCRIPTION = exports2.ATTR_PROCESS_PID = exports2.ATTR_PROCESS_OWNER = exports2.ATTR_PROCESS_EXECUTABLE_PATH = exports2.ATTR_PROCESS_EXECUTABLE_NAME = exports2.ATTR_PROCESS_COMMAND_ARGS = exports2.ATTR_PROCESS_COMMAND = exports2.ATTR_OS_VERSION = exports2.ATTR_OS_TYPE = exports2.ATTR_K8S_POD_NAME = exports2.ATTR_K8S_NAMESPACE_NAME = exports2.ATTR_K8S_DEPLOYMENT_NAME = exports2.ATTR_K8S_CLUSTER_NAME = exports2.ATTR_HOST_TYPE = exports2.ATTR_HOST_NAME = exports2.ATTR_HOST_IMAGE_VERSION = exports2.ATTR_HOST_IMAGE_NAME = exports2.ATTR_HOST_IMAGE_ID = exports2.ATTR_HOST_ID = exports2.ATTR_HOST_ARCH = exports2.ATTR_CONTAINER_NAME = exports2.ATTR_CONTAINER_IMAGE_TAGS = exports2.ATTR_CONTAINER_IMAGE_NAME = exports2.ATTR_CONTAINER_ID = exports2.ATTR_CLOUD_REGION = exports2.ATTR_CLOUD_PROVIDER = exports2.ATTR_CLOUD_AVAILABILITY_ZONE = exports2.ATTR_CLOUD_ACCOUNT_ID = void 0;
    exports2.ATTR_CLOUD_ACCOUNT_ID = "cloud.account.id";
    exports2.ATTR_CLOUD_AVAILABILITY_ZONE = "cloud.availability_zone";
    exports2.ATTR_CLOUD_PROVIDER = "cloud.provider";
    exports2.ATTR_CLOUD_REGION = "cloud.region";
    exports2.ATTR_CONTAINER_ID = "container.id";
    exports2.ATTR_CONTAINER_IMAGE_NAME = "container.image.name";
    exports2.ATTR_CONTAINER_IMAGE_TAGS = "container.image.tags";
    exports2.ATTR_CONTAINER_NAME = "container.name";
    exports2.ATTR_HOST_ARCH = "host.arch";
    exports2.ATTR_HOST_ID = "host.id";
    exports2.ATTR_HOST_IMAGE_ID = "host.image.id";
    exports2.ATTR_HOST_IMAGE_NAME = "host.image.name";
    exports2.ATTR_HOST_IMAGE_VERSION = "host.image.version";
    exports2.ATTR_HOST_NAME = "host.name";
    exports2.ATTR_HOST_TYPE = "host.type";
    exports2.ATTR_K8S_CLUSTER_NAME = "k8s.cluster.name";
    exports2.ATTR_K8S_DEPLOYMENT_NAME = "k8s.deployment.name";
    exports2.ATTR_K8S_NAMESPACE_NAME = "k8s.namespace.name";
    exports2.ATTR_K8S_POD_NAME = "k8s.pod.name";
    exports2.ATTR_OS_TYPE = "os.type";
    exports2.ATTR_OS_VERSION = "os.version";
    exports2.ATTR_PROCESS_COMMAND = "process.command";
    exports2.ATTR_PROCESS_COMMAND_ARGS = "process.command_args";
    exports2.ATTR_PROCESS_EXECUTABLE_NAME = "process.executable.name";
    exports2.ATTR_PROCESS_EXECUTABLE_PATH = "process.executable.path";
    exports2.ATTR_PROCESS_OWNER = "process.owner";
    exports2.ATTR_PROCESS_PID = "process.pid";
    exports2.ATTR_PROCESS_RUNTIME_DESCRIPTION = "process.runtime.description";
    exports2.ATTR_PROCESS_RUNTIME_NAME = "process.runtime.name";
    exports2.ATTR_PROCESS_RUNTIME_VERSION = "process.runtime.version";
    exports2.ATTR_SERVICE_INSTANCE_ID = "service.instance.id";
    exports2.ATTR_SERVICE_NAMESPACE = "service.namespace";
    exports2.ATTR_WEBENGINE_DESCRIPTION = "webengine.description";
    exports2.ATTR_WEBENGINE_NAME = "webengine.name";
    exports2.ATTR_WEBENGINE_VERSION = "webengine.version";
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/execAsync.js
var require_execAsync = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/execAsync.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.execAsync = void 0;
    var child_process = require("child_process");
    var util = require("util");
    exports2.execAsync = util.promisify(child_process.exec);
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-darwin.js
var require_getMachineId_darwin = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-darwin.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getMachineId = void 0;
    var execAsync_1 = require_execAsync();
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    async function getMachineId() {
      try {
        const result = await (0, execAsync_1.execAsync)('ioreg -rd1 -c "IOPlatformExpertDevice"');
        const idLine = result.stdout.split("\n").find((line) => line.includes("IOPlatformUUID"));
        if (!idLine) {
          return void 0;
        }
        const parts = idLine.split('" = "');
        if (parts.length === 2) {
          return parts[1].slice(0, -1);
        }
      } catch (e) {
        api_1.diag.debug(`error reading machine id: ${e}`);
      }
      return void 0;
    }
    exports2.getMachineId = getMachineId;
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-linux.js
var require_getMachineId_linux = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-linux.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getMachineId = void 0;
    var fs_1 = require("fs");
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    async function getMachineId() {
      const paths = ["/etc/machine-id", "/var/lib/dbus/machine-id"];
      for (const path of paths) {
        try {
          const result = await fs_1.promises.readFile(path, { encoding: "utf8" });
          return result.trim();
        } catch (e) {
          api_1.diag.debug(`error reading machine id: ${e}`);
        }
      }
      return void 0;
    }
    exports2.getMachineId = getMachineId;
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-bsd.js
var require_getMachineId_bsd = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-bsd.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getMachineId = void 0;
    var fs_1 = require("fs");
    var execAsync_1 = require_execAsync();
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    async function getMachineId() {
      try {
        const result = await fs_1.promises.readFile("/etc/hostid", { encoding: "utf8" });
        return result.trim();
      } catch (e) {
        api_1.diag.debug(`error reading machine id: ${e}`);
      }
      try {
        const result = await (0, execAsync_1.execAsync)("kenv -q smbios.system.uuid");
        return result.stdout.trim();
      } catch (e) {
        api_1.diag.debug(`error reading machine id: ${e}`);
      }
      return void 0;
    }
    exports2.getMachineId = getMachineId;
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-win.js
var require_getMachineId_win = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-win.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getMachineId = void 0;
    var process2 = require("process");
    var execAsync_1 = require_execAsync();
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    async function getMachineId() {
      const args = "QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid";
      let command = "%windir%\\System32\\REG.exe";
      if (process2.arch === "ia32" && "PROCESSOR_ARCHITEW6432" in process2.env) {
        command = "%windir%\\sysnative\\cmd.exe /c " + command;
      }
      try {
        const result = await (0, execAsync_1.execAsync)(`${command} ${args}`);
        const parts = result.stdout.split("REG_SZ");
        if (parts.length === 2) {
          return parts[1].trim();
        }
      } catch (e) {
        api_1.diag.debug(`error reading machine id: ${e}`);
      }
      return void 0;
    }
    exports2.getMachineId = getMachineId;
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-unsupported.js
var require_getMachineId_unsupported = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-unsupported.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getMachineId = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    async function getMachineId() {
      api_1.diag.debug("could not read machine-id: unsupported platform");
      return void 0;
    }
    exports2.getMachineId = getMachineId;
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId.js
var require_getMachineId = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getMachineId = void 0;
    var process2 = require("process");
    var getMachineIdImpl;
    async function getMachineId() {
      if (!getMachineIdImpl) {
        switch (process2.platform) {
          case "darwin":
            getMachineIdImpl = (await Promise.resolve().then(() => __toESM(require_getMachineId_darwin()))).getMachineId;
            break;
          case "linux":
            getMachineIdImpl = (await Promise.resolve().then(() => __toESM(require_getMachineId_linux()))).getMachineId;
            break;
          case "freebsd":
            getMachineIdImpl = (await Promise.resolve().then(() => __toESM(require_getMachineId_bsd()))).getMachineId;
            break;
          case "win32":
            getMachineIdImpl = (await Promise.resolve().then(() => __toESM(require_getMachineId_win()))).getMachineId;
            break;
          default:
            getMachineIdImpl = (await Promise.resolve().then(() => __toESM(require_getMachineId_unsupported()))).getMachineId;
            break;
        }
      }
      return getMachineIdImpl();
    }
    exports2.getMachineId = getMachineId;
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/platform/node/utils.js
var require_utils3 = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/platform/node/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.normalizeType = exports2.normalizeArch = void 0;
    var normalizeArch = (nodeArchString) => {
      switch (nodeArchString) {
        case "arm":
          return "arm32";
        case "ppc":
          return "ppc32";
        case "x64":
          return "amd64";
        default:
          return nodeArchString;
      }
    };
    exports2.normalizeArch = normalizeArch;
    var normalizeType = (nodePlatform) => {
      switch (nodePlatform) {
        case "sunos":
          return "solaris";
        case "win32":
          return "windows";
        default:
          return nodePlatform;
      }
    };
    exports2.normalizeType = normalizeType;
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/platform/node/HostDetector.js
var require_HostDetector = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/platform/node/HostDetector.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.hostDetector = void 0;
    var semconv_1 = require_semconv2();
    var os_1 = require("os");
    var getMachineId_1 = require_getMachineId();
    var utils_1 = require_utils3();
    var HostDetector = class {
      detect(_config) {
        const attributes = {
          [semconv_1.ATTR_HOST_NAME]: (0, os_1.hostname)(),
          [semconv_1.ATTR_HOST_ARCH]: (0, utils_1.normalizeArch)((0, os_1.arch)()),
          [semconv_1.ATTR_HOST_ID]: (0, getMachineId_1.getMachineId)()
        };
        return { attributes };
      }
    };
    exports2.hostDetector = new HostDetector();
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/platform/node/OSDetector.js
var require_OSDetector = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/platform/node/OSDetector.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.osDetector = void 0;
    var semconv_1 = require_semconv2();
    var os_1 = require("os");
    var utils_1 = require_utils3();
    var OSDetector = class {
      detect(_config) {
        const attributes = {
          [semconv_1.ATTR_OS_TYPE]: (0, utils_1.normalizeType)((0, os_1.platform)()),
          [semconv_1.ATTR_OS_VERSION]: (0, os_1.release)()
        };
        return { attributes };
      }
    };
    exports2.osDetector = new OSDetector();
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/platform/node/ProcessDetector.js
var require_ProcessDetector = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/platform/node/ProcessDetector.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processDetector = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var semconv_1 = require_semconv2();
    var os = require("os");
    var ProcessDetector = class {
      detect(_config) {
        const attributes = {
          [semconv_1.ATTR_PROCESS_PID]: process.pid,
          [semconv_1.ATTR_PROCESS_EXECUTABLE_NAME]: process.title,
          [semconv_1.ATTR_PROCESS_EXECUTABLE_PATH]: process.execPath,
          [semconv_1.ATTR_PROCESS_COMMAND_ARGS]: [
            process.argv[0],
            ...process.execArgv,
            ...process.argv.slice(1)
          ],
          [semconv_1.ATTR_PROCESS_RUNTIME_VERSION]: process.versions.node,
          [semconv_1.ATTR_PROCESS_RUNTIME_NAME]: "nodejs",
          [semconv_1.ATTR_PROCESS_RUNTIME_DESCRIPTION]: "Node.js"
        };
        if (process.argv.length > 1) {
          attributes[semconv_1.ATTR_PROCESS_COMMAND] = process.argv[1];
        }
        try {
          const userInfo = os.userInfo();
          attributes[semconv_1.ATTR_PROCESS_OWNER] = userInfo.username;
        } catch (e) {
          api_1.diag.debug(`error obtaining process owner: ${e}`);
        }
        return { attributes };
      }
    };
    exports2.processDetector = new ProcessDetector();
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/platform/node/ServiceInstanceIdDetector.js
var require_ServiceInstanceIdDetector = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/platform/node/ServiceInstanceIdDetector.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.serviceInstanceIdDetector = void 0;
    var semconv_1 = require_semconv2();
    var crypto_1 = require("crypto");
    var ServiceInstanceIdDetector = class {
      detect(_config) {
        return {
          attributes: {
            [semconv_1.ATTR_SERVICE_INSTANCE_ID]: (0, crypto_1.randomUUID)()
          }
        };
      }
    };
    exports2.serviceInstanceIdDetector = new ServiceInstanceIdDetector();
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/platform/node/index.js
var require_node3 = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/platform/node/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.serviceInstanceIdDetector = exports2.processDetector = exports2.osDetector = exports2.hostDetector = void 0;
    var HostDetector_1 = require_HostDetector();
    Object.defineProperty(exports2, "hostDetector", { enumerable: true, get: function() {
      return HostDetector_1.hostDetector;
    } });
    var OSDetector_1 = require_OSDetector();
    Object.defineProperty(exports2, "osDetector", { enumerable: true, get: function() {
      return OSDetector_1.osDetector;
    } });
    var ProcessDetector_1 = require_ProcessDetector();
    Object.defineProperty(exports2, "processDetector", { enumerable: true, get: function() {
      return ProcessDetector_1.processDetector;
    } });
    var ServiceInstanceIdDetector_1 = require_ServiceInstanceIdDetector();
    Object.defineProperty(exports2, "serviceInstanceIdDetector", { enumerable: true, get: function() {
      return ServiceInstanceIdDetector_1.serviceInstanceIdDetector;
    } });
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/platform/index.js
var require_platform3 = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/platform/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.serviceInstanceIdDetector = exports2.processDetector = exports2.osDetector = exports2.hostDetector = void 0;
    var node_1 = require_node3();
    Object.defineProperty(exports2, "hostDetector", { enumerable: true, get: function() {
      return node_1.hostDetector;
    } });
    Object.defineProperty(exports2, "osDetector", { enumerable: true, get: function() {
      return node_1.osDetector;
    } });
    Object.defineProperty(exports2, "processDetector", { enumerable: true, get: function() {
      return node_1.processDetector;
    } });
    Object.defineProperty(exports2, "serviceInstanceIdDetector", { enumerable: true, get: function() {
      return node_1.serviceInstanceIdDetector;
    } });
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/NoopDetector.js
var require_NoopDetector = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/NoopDetector.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.noopDetector = exports2.NoopDetector = void 0;
    var NoopDetector = class {
      detect() {
        return {
          attributes: {}
        };
      }
    };
    exports2.NoopDetector = NoopDetector;
    exports2.noopDetector = new NoopDetector();
  }
});

// node_modules/@opentelemetry/resources/build/src/detectors/index.js
var require_detectors = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/detectors/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.noopDetector = exports2.serviceInstanceIdDetector = exports2.processDetector = exports2.osDetector = exports2.hostDetector = exports2.envDetector = void 0;
    var EnvDetector_1 = require_EnvDetector();
    Object.defineProperty(exports2, "envDetector", { enumerable: true, get: function() {
      return EnvDetector_1.envDetector;
    } });
    var platform_1 = require_platform3();
    Object.defineProperty(exports2, "hostDetector", { enumerable: true, get: function() {
      return platform_1.hostDetector;
    } });
    Object.defineProperty(exports2, "osDetector", { enumerable: true, get: function() {
      return platform_1.osDetector;
    } });
    Object.defineProperty(exports2, "processDetector", { enumerable: true, get: function() {
      return platform_1.processDetector;
    } });
    Object.defineProperty(exports2, "serviceInstanceIdDetector", { enumerable: true, get: function() {
      return platform_1.serviceInstanceIdDetector;
    } });
    var NoopDetector_1 = require_NoopDetector();
    Object.defineProperty(exports2, "noopDetector", { enumerable: true, get: function() {
      return NoopDetector_1.noopDetector;
    } });
  }
});

// node_modules/@opentelemetry/resources/build/src/index.js
var require_src2 = __commonJS({
  "node_modules/@opentelemetry/resources/build/src/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultServiceName = exports2.emptyResource = exports2.defaultResource = exports2.resourceFromAttributes = exports2.serviceInstanceIdDetector = exports2.processDetector = exports2.osDetector = exports2.hostDetector = exports2.envDetector = exports2.detectResources = void 0;
    var detect_resources_1 = require_detect_resources();
    Object.defineProperty(exports2, "detectResources", { enumerable: true, get: function() {
      return detect_resources_1.detectResources;
    } });
    var detectors_1 = require_detectors();
    Object.defineProperty(exports2, "envDetector", { enumerable: true, get: function() {
      return detectors_1.envDetector;
    } });
    Object.defineProperty(exports2, "hostDetector", { enumerable: true, get: function() {
      return detectors_1.hostDetector;
    } });
    Object.defineProperty(exports2, "osDetector", { enumerable: true, get: function() {
      return detectors_1.osDetector;
    } });
    Object.defineProperty(exports2, "processDetector", { enumerable: true, get: function() {
      return detectors_1.processDetector;
    } });
    Object.defineProperty(exports2, "serviceInstanceIdDetector", { enumerable: true, get: function() {
      return detectors_1.serviceInstanceIdDetector;
    } });
    var ResourceImpl_1 = require_ResourceImpl();
    Object.defineProperty(exports2, "resourceFromAttributes", { enumerable: true, get: function() {
      return ResourceImpl_1.resourceFromAttributes;
    } });
    Object.defineProperty(exports2, "defaultResource", { enumerable: true, get: function() {
      return ResourceImpl_1.defaultResource;
    } });
    Object.defineProperty(exports2, "emptyResource", { enumerable: true, get: function() {
      return ResourceImpl_1.emptyResource;
    } });
    var platform_1 = require_platform2();
    Object.defineProperty(exports2, "defaultServiceName", { enumerable: true, get: function() {
      return platform_1.defaultServiceName;
    } });
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/enums.js
var require_enums = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/enums.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ExceptionEventName = void 0;
    exports2.ExceptionEventName = "exception";
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/Span.js
var require_Span = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/Span.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SpanImpl = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var core_1 = require_src();
    var semantic_conventions_1 = (init_esm2(), __toCommonJS(esm_exports2));
    var enums_1 = require_enums();
    var SpanImpl = class {
      // Below properties are included to implement ReadableSpan for export
      // purposes but are not intended to be written-to directly.
      _spanContext;
      kind;
      parentSpanContext;
      attributes = {};
      links = [];
      events = [];
      startTime;
      resource;
      instrumentationScope;
      _droppedAttributesCount = 0;
      _droppedEventsCount = 0;
      _droppedLinksCount = 0;
      name;
      status = {
        code: api_1.SpanStatusCode.UNSET
      };
      endTime = [0, 0];
      _ended = false;
      _duration = [-1, -1];
      _spanProcessor;
      _spanLimits;
      _attributeValueLengthLimit;
      _performanceStartTime;
      _performanceOffset;
      _startTimeProvided;
      /**
       * Constructs a new SpanImpl instance.
       */
      constructor(opts) {
        const now = Date.now();
        this._spanContext = opts.spanContext;
        this._performanceStartTime = core_1.otperformance.now();
        this._performanceOffset = now - (this._performanceStartTime + (0, core_1.getTimeOrigin)());
        this._startTimeProvided = opts.startTime != null;
        this._spanLimits = opts.spanLimits;
        this._attributeValueLengthLimit = this._spanLimits.attributeValueLengthLimit || 0;
        this._spanProcessor = opts.spanProcessor;
        this.name = opts.name;
        this.parentSpanContext = opts.parentSpanContext;
        this.kind = opts.kind;
        this.links = opts.links || [];
        this.startTime = this._getTime(opts.startTime ?? now);
        this.resource = opts.resource;
        this.instrumentationScope = opts.scope;
        if (opts.attributes != null) {
          this.setAttributes(opts.attributes);
        }
        this._spanProcessor.onStart(this, opts.context);
      }
      spanContext() {
        return this._spanContext;
      }
      setAttribute(key, value) {
        if (value == null || this._isSpanEnded())
          return this;
        if (key.length === 0) {
          api_1.diag.warn(`Invalid attribute key: ${key}`);
          return this;
        }
        if (!(0, core_1.isAttributeValue)(value)) {
          api_1.diag.warn(`Invalid attribute value set for key: ${key}`);
          return this;
        }
        const { attributeCountLimit } = this._spanLimits;
        if (attributeCountLimit !== void 0 && Object.keys(this.attributes).length >= attributeCountLimit && !Object.prototype.hasOwnProperty.call(this.attributes, key)) {
          this._droppedAttributesCount++;
          return this;
        }
        this.attributes[key] = this._truncateToSize(value);
        return this;
      }
      setAttributes(attributes) {
        for (const [k, v] of Object.entries(attributes)) {
          this.setAttribute(k, v);
        }
        return this;
      }
      /**
       *
       * @param name Span Name
       * @param [attributesOrStartTime] Span attributes or start time
       *     if type is {@type TimeInput} and 3rd param is undefined
       * @param [timeStamp] Specified time stamp for the event
       */
      addEvent(name, attributesOrStartTime, timeStamp) {
        if (this._isSpanEnded())
          return this;
        const { eventCountLimit } = this._spanLimits;
        if (eventCountLimit === 0) {
          api_1.diag.warn("No events allowed.");
          this._droppedEventsCount++;
          return this;
        }
        if (eventCountLimit !== void 0 && this.events.length >= eventCountLimit) {
          if (this._droppedEventsCount === 0) {
            api_1.diag.debug("Dropping extra events.");
          }
          this.events.shift();
          this._droppedEventsCount++;
        }
        if ((0, core_1.isTimeInput)(attributesOrStartTime)) {
          if (!(0, core_1.isTimeInput)(timeStamp)) {
            timeStamp = attributesOrStartTime;
          }
          attributesOrStartTime = void 0;
        }
        const attributes = (0, core_1.sanitizeAttributes)(attributesOrStartTime);
        this.events.push({
          name,
          attributes,
          time: this._getTime(timeStamp),
          droppedAttributesCount: 0
        });
        return this;
      }
      addLink(link) {
        this.links.push(link);
        return this;
      }
      addLinks(links) {
        this.links.push(...links);
        return this;
      }
      setStatus(status) {
        if (this._isSpanEnded())
          return this;
        this.status = { ...status };
        if (this.status.message != null && typeof status.message !== "string") {
          api_1.diag.warn(`Dropping invalid status.message of type '${typeof status.message}', expected 'string'`);
          delete this.status.message;
        }
        return this;
      }
      updateName(name) {
        if (this._isSpanEnded())
          return this;
        this.name = name;
        return this;
      }
      end(endTime) {
        if (this._isSpanEnded()) {
          api_1.diag.error(`${this.name} ${this._spanContext.traceId}-${this._spanContext.spanId} - You can only call end() on a span once.`);
          return;
        }
        this._ended = true;
        this.endTime = this._getTime(endTime);
        this._duration = (0, core_1.hrTimeDuration)(this.startTime, this.endTime);
        if (this._duration[0] < 0) {
          api_1.diag.warn("Inconsistent start and end time, startTime > endTime. Setting span duration to 0ms.", this.startTime, this.endTime);
          this.endTime = this.startTime.slice();
          this._duration = [0, 0];
        }
        if (this._droppedEventsCount > 0) {
          api_1.diag.warn(`Dropped ${this._droppedEventsCount} events because eventCountLimit reached`);
        }
        this._spanProcessor.onEnd(this);
      }
      _getTime(inp) {
        if (typeof inp === "number" && inp <= core_1.otperformance.now()) {
          return (0, core_1.hrTime)(inp + this._performanceOffset);
        }
        if (typeof inp === "number") {
          return (0, core_1.millisToHrTime)(inp);
        }
        if (inp instanceof Date) {
          return (0, core_1.millisToHrTime)(inp.getTime());
        }
        if ((0, core_1.isTimeInputHrTime)(inp)) {
          return inp;
        }
        if (this._startTimeProvided) {
          return (0, core_1.millisToHrTime)(Date.now());
        }
        const msDuration = core_1.otperformance.now() - this._performanceStartTime;
        return (0, core_1.addHrTimes)(this.startTime, (0, core_1.millisToHrTime)(msDuration));
      }
      isRecording() {
        return this._ended === false;
      }
      recordException(exception, time) {
        const attributes = {};
        if (typeof exception === "string") {
          attributes[semantic_conventions_1.ATTR_EXCEPTION_MESSAGE] = exception;
        } else if (exception) {
          if (exception.code) {
            attributes[semantic_conventions_1.ATTR_EXCEPTION_TYPE] = exception.code.toString();
          } else if (exception.name) {
            attributes[semantic_conventions_1.ATTR_EXCEPTION_TYPE] = exception.name;
          }
          if (exception.message) {
            attributes[semantic_conventions_1.ATTR_EXCEPTION_MESSAGE] = exception.message;
          }
          if (exception.stack) {
            attributes[semantic_conventions_1.ATTR_EXCEPTION_STACKTRACE] = exception.stack;
          }
        }
        if (attributes[semantic_conventions_1.ATTR_EXCEPTION_TYPE] || attributes[semantic_conventions_1.ATTR_EXCEPTION_MESSAGE]) {
          this.addEvent(enums_1.ExceptionEventName, attributes, time);
        } else {
          api_1.diag.warn(`Failed to record an exception ${exception}`);
        }
      }
      get duration() {
        return this._duration;
      }
      get ended() {
        return this._ended;
      }
      get droppedAttributesCount() {
        return this._droppedAttributesCount;
      }
      get droppedEventsCount() {
        return this._droppedEventsCount;
      }
      get droppedLinksCount() {
        return this._droppedLinksCount;
      }
      _isSpanEnded() {
        if (this._ended) {
          const error = new Error(`Operation attempted on ended Span {traceId: ${this._spanContext.traceId}, spanId: ${this._spanContext.spanId}}`);
          api_1.diag.warn(`Cannot execute the operation on ended Span {traceId: ${this._spanContext.traceId}, spanId: ${this._spanContext.spanId}}`, error);
        }
        return this._ended;
      }
      // Utility function to truncate given value within size
      // for value type of string, will truncate to given limit
      // for type of non-string, will return same value
      _truncateToLimitUtil(value, limit) {
        if (value.length <= limit) {
          return value;
        }
        return value.substring(0, limit);
      }
      /**
       * If the given attribute value is of type string and has more characters than given {@code attributeValueLengthLimit} then
       * return string with truncated to {@code attributeValueLengthLimit} characters
       *
       * If the given attribute value is array of strings then
       * return new array of strings with each element truncated to {@code attributeValueLengthLimit} characters
       *
       * Otherwise return same Attribute {@code value}
       *
       * @param value Attribute value
       * @returns truncated attribute value if required, otherwise same value
       */
      _truncateToSize(value) {
        const limit = this._attributeValueLengthLimit;
        if (limit <= 0) {
          api_1.diag.warn(`Attribute value limit must be positive, got ${limit}`);
          return value;
        }
        if (typeof value === "string") {
          return this._truncateToLimitUtil(value, limit);
        }
        if (Array.isArray(value)) {
          return value.map((val) => typeof val === "string" ? this._truncateToLimitUtil(val, limit) : val);
        }
        return value;
      }
    };
    exports2.SpanImpl = SpanImpl;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/Sampler.js
var require_Sampler = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/Sampler.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SamplingDecision = void 0;
    var SamplingDecision2;
    (function(SamplingDecision3) {
      SamplingDecision3[SamplingDecision3["NOT_RECORD"] = 0] = "NOT_RECORD";
      SamplingDecision3[SamplingDecision3["RECORD"] = 1] = "RECORD";
      SamplingDecision3[SamplingDecision3["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
    })(SamplingDecision2 = exports2.SamplingDecision || (exports2.SamplingDecision = {}));
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/sampler/AlwaysOffSampler.js
var require_AlwaysOffSampler = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/sampler/AlwaysOffSampler.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AlwaysOffSampler = void 0;
    var Sampler_1 = require_Sampler();
    var AlwaysOffSampler = class {
      shouldSample() {
        return {
          decision: Sampler_1.SamplingDecision.NOT_RECORD
        };
      }
      toString() {
        return "AlwaysOffSampler";
      }
    };
    exports2.AlwaysOffSampler = AlwaysOffSampler;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/sampler/AlwaysOnSampler.js
var require_AlwaysOnSampler = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/sampler/AlwaysOnSampler.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AlwaysOnSampler = void 0;
    var Sampler_1 = require_Sampler();
    var AlwaysOnSampler = class {
      shouldSample() {
        return {
          decision: Sampler_1.SamplingDecision.RECORD_AND_SAMPLED
        };
      }
      toString() {
        return "AlwaysOnSampler";
      }
    };
    exports2.AlwaysOnSampler = AlwaysOnSampler;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/sampler/ParentBasedSampler.js
var require_ParentBasedSampler = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/sampler/ParentBasedSampler.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ParentBasedSampler = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var core_1 = require_src();
    var AlwaysOffSampler_1 = require_AlwaysOffSampler();
    var AlwaysOnSampler_1 = require_AlwaysOnSampler();
    var ParentBasedSampler = class {
      _root;
      _remoteParentSampled;
      _remoteParentNotSampled;
      _localParentSampled;
      _localParentNotSampled;
      constructor(config) {
        this._root = config.root;
        if (!this._root) {
          (0, core_1.globalErrorHandler)(new Error("ParentBasedSampler must have a root sampler configured"));
          this._root = new AlwaysOnSampler_1.AlwaysOnSampler();
        }
        this._remoteParentSampled = config.remoteParentSampled ?? new AlwaysOnSampler_1.AlwaysOnSampler();
        this._remoteParentNotSampled = config.remoteParentNotSampled ?? new AlwaysOffSampler_1.AlwaysOffSampler();
        this._localParentSampled = config.localParentSampled ?? new AlwaysOnSampler_1.AlwaysOnSampler();
        this._localParentNotSampled = config.localParentNotSampled ?? new AlwaysOffSampler_1.AlwaysOffSampler();
      }
      shouldSample(context2, traceId, spanName, spanKind, attributes, links) {
        const parentContext = api_1.trace.getSpanContext(context2);
        if (!parentContext || !(0, api_1.isSpanContextValid)(parentContext)) {
          return this._root.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
        }
        if (parentContext.isRemote) {
          if (parentContext.traceFlags & api_1.TraceFlags.SAMPLED) {
            return this._remoteParentSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
          }
          return this._remoteParentNotSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
        }
        if (parentContext.traceFlags & api_1.TraceFlags.SAMPLED) {
          return this._localParentSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
        }
        return this._localParentNotSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
      }
      toString() {
        return `ParentBased{root=${this._root.toString()}, remoteParentSampled=${this._remoteParentSampled.toString()}, remoteParentNotSampled=${this._remoteParentNotSampled.toString()}, localParentSampled=${this._localParentSampled.toString()}, localParentNotSampled=${this._localParentNotSampled.toString()}}`;
      }
    };
    exports2.ParentBasedSampler = ParentBasedSampler;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/sampler/TraceIdRatioBasedSampler.js
var require_TraceIdRatioBasedSampler = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/sampler/TraceIdRatioBasedSampler.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TraceIdRatioBasedSampler = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var Sampler_1 = require_Sampler();
    var TraceIdRatioBasedSampler = class {
      _ratio;
      _upperBound;
      constructor(_ratio = 0) {
        this._ratio = _ratio;
        this._ratio = this._normalize(_ratio);
        this._upperBound = Math.floor(this._ratio * 4294967295);
      }
      shouldSample(context2, traceId) {
        return {
          decision: (0, api_1.isValidTraceId)(traceId) && this._accumulate(traceId) < this._upperBound ? Sampler_1.SamplingDecision.RECORD_AND_SAMPLED : Sampler_1.SamplingDecision.NOT_RECORD
        };
      }
      toString() {
        return `TraceIdRatioBased{${this._ratio}}`;
      }
      _normalize(ratio) {
        if (typeof ratio !== "number" || isNaN(ratio))
          return 0;
        return ratio >= 1 ? 1 : ratio <= 0 ? 0 : ratio;
      }
      _accumulate(traceId) {
        let accumulation = 0;
        for (let i = 0; i < traceId.length / 8; i++) {
          const pos = i * 8;
          const part = parseInt(traceId.slice(pos, pos + 8), 16);
          accumulation = (accumulation ^ part) >>> 0;
        }
        return accumulation;
      }
    };
    exports2.TraceIdRatioBasedSampler = TraceIdRatioBasedSampler;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/config.js
var require_config = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/config.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.buildSamplerFromEnv = exports2.loadDefaultConfig = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var core_1 = require_src();
    var AlwaysOffSampler_1 = require_AlwaysOffSampler();
    var AlwaysOnSampler_1 = require_AlwaysOnSampler();
    var ParentBasedSampler_1 = require_ParentBasedSampler();
    var TraceIdRatioBasedSampler_1 = require_TraceIdRatioBasedSampler();
    var TracesSamplerValues;
    (function(TracesSamplerValues2) {
      TracesSamplerValues2["AlwaysOff"] = "always_off";
      TracesSamplerValues2["AlwaysOn"] = "always_on";
      TracesSamplerValues2["ParentBasedAlwaysOff"] = "parentbased_always_off";
      TracesSamplerValues2["ParentBasedAlwaysOn"] = "parentbased_always_on";
      TracesSamplerValues2["ParentBasedTraceIdRatio"] = "parentbased_traceidratio";
      TracesSamplerValues2["TraceIdRatio"] = "traceidratio";
    })(TracesSamplerValues || (TracesSamplerValues = {}));
    var DEFAULT_RATIO = 1;
    function loadDefaultConfig() {
      return {
        sampler: buildSamplerFromEnv(),
        forceFlushTimeoutMillis: 3e4,
        generalLimits: {
          attributeValueLengthLimit: (0, core_1.getNumberFromEnv)("OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? Infinity,
          attributeCountLimit: (0, core_1.getNumberFromEnv)("OTEL_ATTRIBUTE_COUNT_LIMIT") ?? 128
        },
        spanLimits: {
          attributeValueLengthLimit: (0, core_1.getNumberFromEnv)("OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? Infinity,
          attributeCountLimit: (0, core_1.getNumberFromEnv)("OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT") ?? 128,
          linkCountLimit: (0, core_1.getNumberFromEnv)("OTEL_SPAN_LINK_COUNT_LIMIT") ?? 128,
          eventCountLimit: (0, core_1.getNumberFromEnv)("OTEL_SPAN_EVENT_COUNT_LIMIT") ?? 128,
          attributePerEventCountLimit: (0, core_1.getNumberFromEnv)("OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT") ?? 128,
          attributePerLinkCountLimit: (0, core_1.getNumberFromEnv)("OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT") ?? 128
        }
      };
    }
    exports2.loadDefaultConfig = loadDefaultConfig;
    function buildSamplerFromEnv() {
      const sampler = (0, core_1.getStringFromEnv)("OTEL_TRACES_SAMPLER") ?? TracesSamplerValues.ParentBasedAlwaysOn;
      switch (sampler) {
        case TracesSamplerValues.AlwaysOn:
          return new AlwaysOnSampler_1.AlwaysOnSampler();
        case TracesSamplerValues.AlwaysOff:
          return new AlwaysOffSampler_1.AlwaysOffSampler();
        case TracesSamplerValues.ParentBasedAlwaysOn:
          return new ParentBasedSampler_1.ParentBasedSampler({
            root: new AlwaysOnSampler_1.AlwaysOnSampler()
          });
        case TracesSamplerValues.ParentBasedAlwaysOff:
          return new ParentBasedSampler_1.ParentBasedSampler({
            root: new AlwaysOffSampler_1.AlwaysOffSampler()
          });
        case TracesSamplerValues.TraceIdRatio:
          return new TraceIdRatioBasedSampler_1.TraceIdRatioBasedSampler(getSamplerProbabilityFromEnv());
        case TracesSamplerValues.ParentBasedTraceIdRatio:
          return new ParentBasedSampler_1.ParentBasedSampler({
            root: new TraceIdRatioBasedSampler_1.TraceIdRatioBasedSampler(getSamplerProbabilityFromEnv())
          });
        default:
          api_1.diag.error(`OTEL_TRACES_SAMPLER value "${sampler}" invalid, defaulting to "${TracesSamplerValues.ParentBasedAlwaysOn}".`);
          return new ParentBasedSampler_1.ParentBasedSampler({
            root: new AlwaysOnSampler_1.AlwaysOnSampler()
          });
      }
    }
    exports2.buildSamplerFromEnv = buildSamplerFromEnv;
    function getSamplerProbabilityFromEnv() {
      const probability = (0, core_1.getNumberFromEnv)("OTEL_TRACES_SAMPLER_ARG");
      if (probability == null) {
        api_1.diag.error(`OTEL_TRACES_SAMPLER_ARG is blank, defaulting to ${DEFAULT_RATIO}.`);
        return DEFAULT_RATIO;
      }
      if (probability < 0 || probability > 1) {
        api_1.diag.error(`OTEL_TRACES_SAMPLER_ARG=${probability} was given, but it is out of range ([0..1]), defaulting to ${DEFAULT_RATIO}.`);
        return DEFAULT_RATIO;
      }
      return probability;
    }
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/utility.js
var require_utility = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/utility.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.reconfigureLimits = exports2.mergeConfig = exports2.DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT = exports2.DEFAULT_ATTRIBUTE_COUNT_LIMIT = void 0;
    var config_1 = require_config();
    var core_1 = require_src();
    exports2.DEFAULT_ATTRIBUTE_COUNT_LIMIT = 128;
    exports2.DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT = Infinity;
    function mergeConfig(userConfig) {
      const perInstanceDefaults = {
        sampler: (0, config_1.buildSamplerFromEnv)()
      };
      const DEFAULT_CONFIG = (0, config_1.loadDefaultConfig)();
      const target = Object.assign({}, DEFAULT_CONFIG, perInstanceDefaults, userConfig);
      target.generalLimits = Object.assign({}, DEFAULT_CONFIG.generalLimits, userConfig.generalLimits || {});
      target.spanLimits = Object.assign({}, DEFAULT_CONFIG.spanLimits, userConfig.spanLimits || {});
      return target;
    }
    exports2.mergeConfig = mergeConfig;
    function reconfigureLimits(userConfig) {
      const spanLimits = Object.assign({}, userConfig.spanLimits);
      spanLimits.attributeCountLimit = userConfig.spanLimits?.attributeCountLimit ?? userConfig.generalLimits?.attributeCountLimit ?? (0, core_1.getNumberFromEnv)("OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT") ?? (0, core_1.getNumberFromEnv)("OTEL_ATTRIBUTE_COUNT_LIMIT") ?? exports2.DEFAULT_ATTRIBUTE_COUNT_LIMIT;
      spanLimits.attributeValueLengthLimit = userConfig.spanLimits?.attributeValueLengthLimit ?? userConfig.generalLimits?.attributeValueLengthLimit ?? (0, core_1.getNumberFromEnv)("OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? (0, core_1.getNumberFromEnv)("OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? exports2.DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT;
      return Object.assign({}, userConfig, { spanLimits });
    }
    exports2.reconfigureLimits = reconfigureLimits;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/export/BatchSpanProcessorBase.js
var require_BatchSpanProcessorBase = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/export/BatchSpanProcessorBase.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BatchSpanProcessorBase = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var core_1 = require_src();
    var BatchSpanProcessorBase = class {
      _exporter;
      _maxExportBatchSize;
      _maxQueueSize;
      _scheduledDelayMillis;
      _exportTimeoutMillis;
      _isExporting = false;
      _finishedSpans = [];
      _timer;
      _shutdownOnce;
      _droppedSpansCount = 0;
      constructor(_exporter, config) {
        this._exporter = _exporter;
        this._maxExportBatchSize = typeof config?.maxExportBatchSize === "number" ? config.maxExportBatchSize : (0, core_1.getNumberFromEnv)("OTEL_BSP_MAX_EXPORT_BATCH_SIZE") ?? 512;
        this._maxQueueSize = typeof config?.maxQueueSize === "number" ? config.maxQueueSize : (0, core_1.getNumberFromEnv)("OTEL_BSP_MAX_QUEUE_SIZE") ?? 2048;
        this._scheduledDelayMillis = typeof config?.scheduledDelayMillis === "number" ? config.scheduledDelayMillis : (0, core_1.getNumberFromEnv)("OTEL_BSP_SCHEDULE_DELAY") ?? 5e3;
        this._exportTimeoutMillis = typeof config?.exportTimeoutMillis === "number" ? config.exportTimeoutMillis : (0, core_1.getNumberFromEnv)("OTEL_BSP_EXPORT_TIMEOUT") ?? 3e4;
        this._shutdownOnce = new core_1.BindOnceFuture(this._shutdown, this);
        if (this._maxExportBatchSize > this._maxQueueSize) {
          api_1.diag.warn("BatchSpanProcessor: maxExportBatchSize must be smaller or equal to maxQueueSize, setting maxExportBatchSize to match maxQueueSize");
          this._maxExportBatchSize = this._maxQueueSize;
        }
      }
      forceFlush() {
        if (this._shutdownOnce.isCalled) {
          return this._shutdownOnce.promise;
        }
        return this._flushAll();
      }
      // does nothing.
      onStart(_span, _parentContext) {
      }
      onEnd(span) {
        if (this._shutdownOnce.isCalled) {
          return;
        }
        if ((span.spanContext().traceFlags & api_1.TraceFlags.SAMPLED) === 0) {
          return;
        }
        this._addToBuffer(span);
      }
      shutdown() {
        return this._shutdownOnce.call();
      }
      _shutdown() {
        return Promise.resolve().then(() => {
          return this.onShutdown();
        }).then(() => {
          return this._flushAll();
        }).then(() => {
          return this._exporter.shutdown();
        });
      }
      /** Add a span in the buffer. */
      _addToBuffer(span) {
        if (this._finishedSpans.length >= this._maxQueueSize) {
          if (this._droppedSpansCount === 0) {
            api_1.diag.debug("maxQueueSize reached, dropping spans");
          }
          this._droppedSpansCount++;
          return;
        }
        if (this._droppedSpansCount > 0) {
          api_1.diag.warn(`Dropped ${this._droppedSpansCount} spans because maxQueueSize reached`);
          this._droppedSpansCount = 0;
        }
        this._finishedSpans.push(span);
        this._maybeStartTimer();
      }
      /**
       * Send all spans to the exporter respecting the batch size limit
       * This function is used only on forceFlush or shutdown,
       * for all other cases _flush should be used
       * */
      _flushAll() {
        return new Promise((resolve, reject) => {
          const promises = [];
          const count = Math.ceil(this._finishedSpans.length / this._maxExportBatchSize);
          for (let i = 0, j = count; i < j; i++) {
            promises.push(this._flushOneBatch());
          }
          Promise.all(promises).then(() => {
            resolve();
          }).catch(reject);
        });
      }
      _flushOneBatch() {
        this._clearTimer();
        if (this._finishedSpans.length === 0) {
          return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error("Timeout"));
          }, this._exportTimeoutMillis);
          api_1.context.with((0, core_1.suppressTracing)(api_1.context.active()), () => {
            let spans;
            if (this._finishedSpans.length <= this._maxExportBatchSize) {
              spans = this._finishedSpans;
              this._finishedSpans = [];
            } else {
              spans = this._finishedSpans.splice(0, this._maxExportBatchSize);
            }
            const doExport = () => this._exporter.export(spans, (result) => {
              clearTimeout(timer);
              if (result.code === core_1.ExportResultCode.SUCCESS) {
                resolve();
              } else {
                reject(result.error ?? new Error("BatchSpanProcessor: span export failed"));
              }
            });
            let pendingResources = null;
            for (let i = 0, len = spans.length; i < len; i++) {
              const span = spans[i];
              if (span.resource.asyncAttributesPending && span.resource.waitForAsyncAttributes) {
                pendingResources ??= [];
                pendingResources.push(span.resource.waitForAsyncAttributes());
              }
            }
            if (pendingResources === null) {
              doExport();
            } else {
              Promise.all(pendingResources).then(doExport, (err) => {
                (0, core_1.globalErrorHandler)(err);
                reject(err);
              });
            }
          });
        });
      }
      _maybeStartTimer() {
        if (this._isExporting)
          return;
        const flush = () => {
          this._isExporting = true;
          this._flushOneBatch().finally(() => {
            this._isExporting = false;
            if (this._finishedSpans.length > 0) {
              this._clearTimer();
              this._maybeStartTimer();
            }
          }).catch((e) => {
            this._isExporting = false;
            (0, core_1.globalErrorHandler)(e);
          });
        };
        if (this._finishedSpans.length >= this._maxExportBatchSize) {
          return flush();
        }
        if (this._timer !== void 0)
          return;
        this._timer = setTimeout(() => flush(), this._scheduledDelayMillis);
        if (typeof this._timer !== "number") {
          this._timer.unref();
        }
      }
      _clearTimer() {
        if (this._timer !== void 0) {
          clearTimeout(this._timer);
          this._timer = void 0;
        }
      }
    };
    exports2.BatchSpanProcessorBase = BatchSpanProcessorBase;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/platform/node/export/BatchSpanProcessor.js
var require_BatchSpanProcessor = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/platform/node/export/BatchSpanProcessor.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BatchSpanProcessor = void 0;
    var BatchSpanProcessorBase_1 = require_BatchSpanProcessorBase();
    var BatchSpanProcessor = class extends BatchSpanProcessorBase_1.BatchSpanProcessorBase {
      onShutdown() {
      }
    };
    exports2.BatchSpanProcessor = BatchSpanProcessor;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/platform/node/RandomIdGenerator.js
var require_RandomIdGenerator = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/platform/node/RandomIdGenerator.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RandomIdGenerator = void 0;
    var SPAN_ID_BYTES = 8;
    var TRACE_ID_BYTES = 16;
    var RandomIdGenerator = class {
      /**
       * Returns a random 16-byte trace ID formatted/encoded as a 32 lowercase hex
       * characters corresponding to 128 bits.
       */
      generateTraceId = getIdGenerator(TRACE_ID_BYTES);
      /**
       * Returns a random 8-byte span ID formatted/encoded as a 16 lowercase hex
       * characters corresponding to 64 bits.
       */
      generateSpanId = getIdGenerator(SPAN_ID_BYTES);
    };
    exports2.RandomIdGenerator = RandomIdGenerator;
    var SHARED_BUFFER = Buffer.allocUnsafe(TRACE_ID_BYTES);
    function getIdGenerator(bytes) {
      return function generateId() {
        for (let i = 0; i < bytes / 4; i++) {
          SHARED_BUFFER.writeUInt32BE(Math.random() * 2 ** 32 >>> 0, i * 4);
        }
        for (let i = 0; i < bytes; i++) {
          if (SHARED_BUFFER[i] > 0) {
            break;
          } else if (i === bytes - 1) {
            SHARED_BUFFER[bytes - 1] = 1;
          }
        }
        return SHARED_BUFFER.toString("hex", 0, bytes);
      };
    }
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/platform/node/index.js
var require_node4 = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/platform/node/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RandomIdGenerator = exports2.BatchSpanProcessor = void 0;
    var BatchSpanProcessor_1 = require_BatchSpanProcessor();
    Object.defineProperty(exports2, "BatchSpanProcessor", { enumerable: true, get: function() {
      return BatchSpanProcessor_1.BatchSpanProcessor;
    } });
    var RandomIdGenerator_1 = require_RandomIdGenerator();
    Object.defineProperty(exports2, "RandomIdGenerator", { enumerable: true, get: function() {
      return RandomIdGenerator_1.RandomIdGenerator;
    } });
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/platform/index.js
var require_platform4 = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/platform/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RandomIdGenerator = exports2.BatchSpanProcessor = void 0;
    var node_1 = require_node4();
    Object.defineProperty(exports2, "BatchSpanProcessor", { enumerable: true, get: function() {
      return node_1.BatchSpanProcessor;
    } });
    Object.defineProperty(exports2, "RandomIdGenerator", { enumerable: true, get: function() {
      return node_1.RandomIdGenerator;
    } });
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/Tracer.js
var require_Tracer = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/Tracer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Tracer = void 0;
    var api = (init_esm(), __toCommonJS(esm_exports));
    var core_1 = require_src();
    var Span_1 = require_Span();
    var utility_1 = require_utility();
    var platform_1 = require_platform4();
    var Tracer = class {
      _sampler;
      _generalLimits;
      _spanLimits;
      _idGenerator;
      instrumentationScope;
      _resource;
      _spanProcessor;
      /**
       * Constructs a new Tracer instance.
       */
      constructor(instrumentationScope, config, resource, spanProcessor) {
        const localConfig = (0, utility_1.mergeConfig)(config);
        this._sampler = localConfig.sampler;
        this._generalLimits = localConfig.generalLimits;
        this._spanLimits = localConfig.spanLimits;
        this._idGenerator = config.idGenerator || new platform_1.RandomIdGenerator();
        this._resource = resource;
        this._spanProcessor = spanProcessor;
        this.instrumentationScope = instrumentationScope;
      }
      /**
       * Starts a new Span or returns the default NoopSpan based on the sampling
       * decision.
       */
      startSpan(name, options = {}, context2 = api.context.active()) {
        if (options.root) {
          context2 = api.trace.deleteSpan(context2);
        }
        const parentSpan = api.trace.getSpan(context2);
        if ((0, core_1.isTracingSuppressed)(context2)) {
          api.diag.debug("Instrumentation suppressed, returning Noop Span");
          const nonRecordingSpan = api.trace.wrapSpanContext(api.INVALID_SPAN_CONTEXT);
          return nonRecordingSpan;
        }
        const parentSpanContext = parentSpan?.spanContext();
        const spanId = this._idGenerator.generateSpanId();
        let validParentSpanContext;
        let traceId;
        let traceState;
        if (!parentSpanContext || !api.trace.isSpanContextValid(parentSpanContext)) {
          traceId = this._idGenerator.generateTraceId();
        } else {
          traceId = parentSpanContext.traceId;
          traceState = parentSpanContext.traceState;
          validParentSpanContext = parentSpanContext;
        }
        const spanKind = options.kind ?? api.SpanKind.INTERNAL;
        const links = (options.links ?? []).map((link) => {
          return {
            context: link.context,
            attributes: (0, core_1.sanitizeAttributes)(link.attributes)
          };
        });
        const attributes = (0, core_1.sanitizeAttributes)(options.attributes);
        const samplingResult = this._sampler.shouldSample(context2, traceId, name, spanKind, attributes, links);
        traceState = samplingResult.traceState ?? traceState;
        const traceFlags = samplingResult.decision === api.SamplingDecision.RECORD_AND_SAMPLED ? api.TraceFlags.SAMPLED : api.TraceFlags.NONE;
        const spanContext = { traceId, spanId, traceFlags, traceState };
        if (samplingResult.decision === api.SamplingDecision.NOT_RECORD) {
          api.diag.debug("Recording is off, propagating context in a non-recording span");
          const nonRecordingSpan = api.trace.wrapSpanContext(spanContext);
          return nonRecordingSpan;
        }
        const initAttributes = (0, core_1.sanitizeAttributes)(Object.assign(attributes, samplingResult.attributes));
        const span = new Span_1.SpanImpl({
          resource: this._resource,
          scope: this.instrumentationScope,
          context: context2,
          spanContext,
          name,
          kind: spanKind,
          links,
          parentSpanContext: validParentSpanContext,
          attributes: initAttributes,
          startTime: options.startTime,
          spanProcessor: this._spanProcessor,
          spanLimits: this._spanLimits
        });
        return span;
      }
      startActiveSpan(name, arg2, arg3, arg4) {
        let opts;
        let ctx;
        let fn;
        if (arguments.length < 2) {
          return;
        } else if (arguments.length === 2) {
          fn = arg2;
        } else if (arguments.length === 3) {
          opts = arg2;
          fn = arg3;
        } else {
          opts = arg2;
          ctx = arg3;
          fn = arg4;
        }
        const parentContext = ctx ?? api.context.active();
        const span = this.startSpan(name, opts, parentContext);
        const contextWithSpanSet = api.trace.setSpan(parentContext, span);
        return api.context.with(contextWithSpanSet, fn, void 0, span);
      }
      /** Returns the active {@link GeneralLimits}. */
      getGeneralLimits() {
        return this._generalLimits;
      }
      /** Returns the active {@link SpanLimits}. */
      getSpanLimits() {
        return this._spanLimits;
      }
    };
    exports2.Tracer = Tracer;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/MultiSpanProcessor.js
var require_MultiSpanProcessor = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/MultiSpanProcessor.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MultiSpanProcessor = void 0;
    var core_1 = require_src();
    var MultiSpanProcessor = class {
      _spanProcessors;
      constructor(_spanProcessors) {
        this._spanProcessors = _spanProcessors;
      }
      forceFlush() {
        const promises = [];
        for (const spanProcessor of this._spanProcessors) {
          promises.push(spanProcessor.forceFlush());
        }
        return new Promise((resolve) => {
          Promise.all(promises).then(() => {
            resolve();
          }).catch((error) => {
            (0, core_1.globalErrorHandler)(error || new Error("MultiSpanProcessor: forceFlush failed"));
            resolve();
          });
        });
      }
      onStart(span, context2) {
        for (const spanProcessor of this._spanProcessors) {
          spanProcessor.onStart(span, context2);
        }
      }
      onEnd(span) {
        for (const spanProcessor of this._spanProcessors) {
          spanProcessor.onEnd(span);
        }
      }
      shutdown() {
        const promises = [];
        for (const spanProcessor of this._spanProcessors) {
          promises.push(spanProcessor.shutdown());
        }
        return new Promise((resolve, reject) => {
          Promise.all(promises).then(() => {
            resolve();
          }, reject);
        });
      }
    };
    exports2.MultiSpanProcessor = MultiSpanProcessor;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/BasicTracerProvider.js
var require_BasicTracerProvider = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/BasicTracerProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BasicTracerProvider = exports2.ForceFlushState = void 0;
    var core_1 = require_src();
    var resources_1 = require_src2();
    var Tracer_1 = require_Tracer();
    var config_1 = require_config();
    var MultiSpanProcessor_1 = require_MultiSpanProcessor();
    var utility_1 = require_utility();
    var ForceFlushState;
    (function(ForceFlushState2) {
      ForceFlushState2[ForceFlushState2["resolved"] = 0] = "resolved";
      ForceFlushState2[ForceFlushState2["timeout"] = 1] = "timeout";
      ForceFlushState2[ForceFlushState2["error"] = 2] = "error";
      ForceFlushState2[ForceFlushState2["unresolved"] = 3] = "unresolved";
    })(ForceFlushState = exports2.ForceFlushState || (exports2.ForceFlushState = {}));
    var BasicTracerProvider = class {
      _config;
      _tracers = /* @__PURE__ */ new Map();
      _resource;
      _activeSpanProcessor;
      constructor(config = {}) {
        const mergedConfig = (0, core_1.merge)({}, (0, config_1.loadDefaultConfig)(), (0, utility_1.reconfigureLimits)(config));
        this._resource = mergedConfig.resource ?? (0, resources_1.defaultResource)();
        this._config = Object.assign({}, mergedConfig, {
          resource: this._resource
        });
        const spanProcessors = [];
        if (config.spanProcessors?.length) {
          spanProcessors.push(...config.spanProcessors);
        }
        this._activeSpanProcessor = new MultiSpanProcessor_1.MultiSpanProcessor(spanProcessors);
      }
      getTracer(name, version, options) {
        const key = `${name}@${version || ""}:${options?.schemaUrl || ""}`;
        if (!this._tracers.has(key)) {
          this._tracers.set(key, new Tracer_1.Tracer({ name, version, schemaUrl: options?.schemaUrl }, this._config, this._resource, this._activeSpanProcessor));
        }
        return this._tracers.get(key);
      }
      forceFlush() {
        const timeout = this._config.forceFlushTimeoutMillis;
        const promises = this._activeSpanProcessor["_spanProcessors"].map((spanProcessor) => {
          return new Promise((resolve) => {
            let state;
            const timeoutInterval = setTimeout(() => {
              resolve(new Error(`Span processor did not completed within timeout period of ${timeout} ms`));
              state = ForceFlushState.timeout;
            }, timeout);
            spanProcessor.forceFlush().then(() => {
              clearTimeout(timeoutInterval);
              if (state !== ForceFlushState.timeout) {
                state = ForceFlushState.resolved;
                resolve(state);
              }
            }).catch((error) => {
              clearTimeout(timeoutInterval);
              state = ForceFlushState.error;
              resolve(error);
            });
          });
        });
        return new Promise((resolve, reject) => {
          Promise.all(promises).then((results) => {
            const errors = results.filter((result) => result !== ForceFlushState.resolved);
            if (errors.length > 0) {
              reject(errors);
            } else {
              resolve();
            }
          }).catch((error) => reject([error]));
        });
      }
      shutdown() {
        return this._activeSpanProcessor.shutdown();
      }
    };
    exports2.BasicTracerProvider = BasicTracerProvider;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/export/ConsoleSpanExporter.js
var require_ConsoleSpanExporter = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/export/ConsoleSpanExporter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ConsoleSpanExporter = void 0;
    var core_1 = require_src();
    var ConsoleSpanExporter = class {
      /**
       * Export spans.
       * @param spans
       * @param resultCallback
       */
      export(spans, resultCallback) {
        return this._sendSpans(spans, resultCallback);
      }
      /**
       * Shutdown the exporter.
       */
      shutdown() {
        this._sendSpans([]);
        return this.forceFlush();
      }
      /**
       * Exports any pending spans in exporter
       */
      forceFlush() {
        return Promise.resolve();
      }
      /**
       * converts span info into more readable format
       * @param span
       */
      _exportInfo(span) {
        return {
          resource: {
            attributes: span.resource.attributes
          },
          instrumentationScope: span.instrumentationScope,
          traceId: span.spanContext().traceId,
          parentSpanContext: span.parentSpanContext,
          traceState: span.spanContext().traceState?.serialize(),
          name: span.name,
          id: span.spanContext().spanId,
          kind: span.kind,
          timestamp: (0, core_1.hrTimeToMicroseconds)(span.startTime),
          duration: (0, core_1.hrTimeToMicroseconds)(span.duration),
          attributes: span.attributes,
          status: span.status,
          events: span.events,
          links: span.links
        };
      }
      /**
       * Showing spans in console
       * @param spans
       * @param done
       */
      _sendSpans(spans, done) {
        for (const span of spans) {
          console.dir(this._exportInfo(span), { depth: 3 });
        }
        if (done) {
          return done({ code: core_1.ExportResultCode.SUCCESS });
        }
      }
    };
    exports2.ConsoleSpanExporter = ConsoleSpanExporter;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/export/InMemorySpanExporter.js
var require_InMemorySpanExporter = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/export/InMemorySpanExporter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.InMemorySpanExporter = void 0;
    var core_1 = require_src();
    var InMemorySpanExporter = class {
      _finishedSpans = [];
      /**
       * Indicates if the exporter has been "shutdown."
       * When false, exported spans will not be stored in-memory.
       */
      _stopped = false;
      export(spans, resultCallback) {
        if (this._stopped)
          return resultCallback({
            code: core_1.ExportResultCode.FAILED,
            error: new Error("Exporter has been stopped")
          });
        this._finishedSpans.push(...spans);
        setTimeout(() => resultCallback({ code: core_1.ExportResultCode.SUCCESS }), 0);
      }
      shutdown() {
        this._stopped = true;
        this._finishedSpans = [];
        return this.forceFlush();
      }
      /**
       * Exports any pending spans in the exporter
       */
      forceFlush() {
        return Promise.resolve();
      }
      reset() {
        this._finishedSpans = [];
      }
      getFinishedSpans() {
        return this._finishedSpans;
      }
    };
    exports2.InMemorySpanExporter = InMemorySpanExporter;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/export/SimpleSpanProcessor.js
var require_SimpleSpanProcessor = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/export/SimpleSpanProcessor.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SimpleSpanProcessor = void 0;
    var api_1 = (init_esm(), __toCommonJS(esm_exports));
    var core_1 = require_src();
    var SimpleSpanProcessor = class {
      _exporter;
      _shutdownOnce;
      _pendingExports;
      constructor(_exporter) {
        this._exporter = _exporter;
        this._shutdownOnce = new core_1.BindOnceFuture(this._shutdown, this);
        this._pendingExports = /* @__PURE__ */ new Set();
      }
      async forceFlush() {
        await Promise.all(Array.from(this._pendingExports));
        if (this._exporter.forceFlush) {
          await this._exporter.forceFlush();
        }
      }
      onStart(_span, _parentContext) {
      }
      onEnd(span) {
        if (this._shutdownOnce.isCalled) {
          return;
        }
        if ((span.spanContext().traceFlags & api_1.TraceFlags.SAMPLED) === 0) {
          return;
        }
        const pendingExport = this._doExport(span).catch((err) => (0, core_1.globalErrorHandler)(err));
        this._pendingExports.add(pendingExport);
        void pendingExport.finally(() => this._pendingExports.delete(pendingExport));
      }
      async _doExport(span) {
        if (span.resource.asyncAttributesPending) {
          await span.resource.waitForAsyncAttributes?.();
        }
        const result = await core_1.internal._export(this._exporter, [span]);
        if (result.code !== core_1.ExportResultCode.SUCCESS) {
          throw result.error ?? new Error(`SimpleSpanProcessor: span export failed (status ${result})`);
        }
      }
      shutdown() {
        return this._shutdownOnce.call();
      }
      _shutdown() {
        return this._exporter.shutdown();
      }
    };
    exports2.SimpleSpanProcessor = SimpleSpanProcessor;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/export/NoopSpanProcessor.js
var require_NoopSpanProcessor = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/export/NoopSpanProcessor.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NoopSpanProcessor = void 0;
    var NoopSpanProcessor = class {
      onStart(_span, _context) {
      }
      onEnd(_span) {
      }
      shutdown() {
        return Promise.resolve();
      }
      forceFlush() {
        return Promise.resolve();
      }
    };
    exports2.NoopSpanProcessor = NoopSpanProcessor;
  }
});

// node_modules/@opentelemetry/sdk-trace-base/build/src/index.js
var require_src3 = __commonJS({
  "node_modules/@opentelemetry/sdk-trace-base/build/src/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SamplingDecision = exports2.TraceIdRatioBasedSampler = exports2.ParentBasedSampler = exports2.AlwaysOnSampler = exports2.AlwaysOffSampler = exports2.NoopSpanProcessor = exports2.SimpleSpanProcessor = exports2.InMemorySpanExporter = exports2.ConsoleSpanExporter = exports2.RandomIdGenerator = exports2.BatchSpanProcessor = exports2.BasicTracerProvider = void 0;
    var BasicTracerProvider_1 = require_BasicTracerProvider();
    Object.defineProperty(exports2, "BasicTracerProvider", { enumerable: true, get: function() {
      return BasicTracerProvider_1.BasicTracerProvider;
    } });
    var platform_1 = require_platform4();
    Object.defineProperty(exports2, "BatchSpanProcessor", { enumerable: true, get: function() {
      return platform_1.BatchSpanProcessor;
    } });
    Object.defineProperty(exports2, "RandomIdGenerator", { enumerable: true, get: function() {
      return platform_1.RandomIdGenerator;
    } });
    var ConsoleSpanExporter_1 = require_ConsoleSpanExporter();
    Object.defineProperty(exports2, "ConsoleSpanExporter", { enumerable: true, get: function() {
      return ConsoleSpanExporter_1.ConsoleSpanExporter;
    } });
    var InMemorySpanExporter_1 = require_InMemorySpanExporter();
    Object.defineProperty(exports2, "InMemorySpanExporter", { enumerable: true, get: function() {
      return InMemorySpanExporter_1.InMemorySpanExporter;
    } });
    var SimpleSpanProcessor_1 = require_SimpleSpanProcessor();
    Object.defineProperty(exports2, "SimpleSpanProcessor", { enumerable: true, get: function() {
      return SimpleSpanProcessor_1.SimpleSpanProcessor;
    } });
    var NoopSpanProcessor_1 = require_NoopSpanProcessor();
    Object.defineProperty(exports2, "NoopSpanProcessor", { enumerable: true, get: function() {
      return NoopSpanProcessor_1.NoopSpanProcessor;
    } });
    var AlwaysOffSampler_1 = require_AlwaysOffSampler();
    Object.defineProperty(exports2, "AlwaysOffSampler", { enumerable: true, get: function() {
      return AlwaysOffSampler_1.AlwaysOffSampler;
    } });
    var AlwaysOnSampler_1 = require_AlwaysOnSampler();
    Object.defineProperty(exports2, "AlwaysOnSampler", { enumerable: true, get: function() {
      return AlwaysOnSampler_1.AlwaysOnSampler;
    } });
    var ParentBasedSampler_1 = require_ParentBasedSampler();
    Object.defineProperty(exports2, "ParentBasedSampler", { enumerable: true, get: function() {
      return ParentBasedSampler_1.ParentBasedSampler;
    } });
    var TraceIdRatioBasedSampler_1 = require_TraceIdRatioBasedSampler();
    Object.defineProperty(exports2, "TraceIdRatioBasedSampler", { enumerable: true, get: function() {
      return TraceIdRatioBasedSampler_1.TraceIdRatioBasedSampler;
    } });
    var Sampler_1 = require_Sampler();
    Object.defineProperty(exports2, "SamplingDecision", { enumerable: true, get: function() {
      return Sampler_1.SamplingDecision;
    } });
  }
});

// node_modules/@aws-amplify/platform-core/lib/telemetry/constants.js
var require_constants4 = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/telemetry/constants.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.telemetrySpanAttributeCountLimit = exports2.TELEMETRY_ENABLED = exports2.latestPayloadVersion = void 0;
    exports2.latestPayloadVersion = "1.0.0";
    exports2.TELEMETRY_ENABLED = "telemetry.enabled";
    exports2.telemetrySpanAttributeCountLimit = 1e3;
  }
});

// node_modules/@aws-amplify/platform-core/lib/telemetry/get_telemetry_url.js
var require_get_telemetry_url = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/telemetry/get_telemetry_url.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getUrl = void 0;
    var node_url_1 = __importDefault(require("node:url"));
    var cachedUrl;
    var prodUrl = `https://telemetry.cli.amplify.aws/metrics`;
    var getUrl = () => {
      if (!cachedUrl) {
        cachedUrl = getParsedUrl();
      }
      return cachedUrl;
    };
    exports2.getUrl = getUrl;
    var getParsedUrl = () => {
      return node_url_1.default.parse(process.env.AMPLIFY_BACKEND_TELEMETRY_TRACKING_ENDPOINT || prodUrl);
    };
  }
});

// node_modules/@aws-amplify/platform-core/lib/telemetry/telemetry_payload.js
var require_telemetry_payload = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/telemetry/telemetry_payload.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.telemetryPayloadSchema = void 0;
    var zod_1 = __importDefault(require_cjs());
    var identifiersSchema = zod_1.default.object({
      payloadVersion: zod_1.default.string(),
      sessionUuid: zod_1.default.string(),
      eventId: zod_1.default.string(),
      timestamp: zod_1.default.string(),
      localProjectId: zod_1.default.string(),
      accountId: zod_1.default.string().optional(),
      awsRegion: zod_1.default.string().optional()
    });
    var eventSchema = zod_1.default.object({
      state: zod_1.default.enum(["ABORTED", "FAILED", "SUCCEEDED"]),
      command: zod_1.default.object({
        path: zod_1.default.array(zod_1.default.string()),
        parameters: zod_1.default.array(zod_1.default.string())
      })
    });
    var environmentSchema = zod_1.default.object({
      os: zod_1.default.object({
        platform: zod_1.default.string(),
        release: zod_1.default.string()
      }),
      shell: zod_1.default.string(),
      npmUserAgent: zod_1.default.string(),
      ci: zod_1.default.boolean(),
      memory: zod_1.default.object({
        total: zod_1.default.number(),
        free: zod_1.default.number()
      })
    });
    var projectSchema = zod_1.default.object({
      dependencies: zod_1.default.array(zod_1.default.object({
        name: zod_1.default.string(),
        version: zod_1.default.string()
      })).optional()
    });
    var latencySchema = zod_1.default.object({
      total: zod_1.default.number(),
      init: zod_1.default.number().optional(),
      synthesis: zod_1.default.number().optional(),
      deployment: zod_1.default.number().optional(),
      hotSwap: zod_1.default.number().optional()
    });
    var errorSchema = zod_1.default.lazy(() => zod_1.default.object({
      name: zod_1.default.string(),
      message: zod_1.default.string(),
      stack: zod_1.default.string(),
      caused: zod_1.default.optional(errorSchema)
      // Recursive reference
    }));
    exports2.telemetryPayloadSchema = zod_1.default.object({
      identifiers: identifiersSchema,
      event: eventSchema,
      environment: environmentSchema,
      project: projectSchema,
      latency: latencySchema,
      error: zod_1.default.optional(errorSchema)
    });
  }
});

// node_modules/@aws-amplify/platform-core/lib/telemetry/get_local_project_id.js
var require_get_local_project_id = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/telemetry/get_local_project_id.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getLocalProjectId = void 0;
    var uuid_1 = require_cjs2();
    var os_1 = require("os");
    var local_configuration_controller_factory_1 = require_local_configuration_controller_factory();
    var path_1 = __importDefault(require("path"));
    var AMPLIFY_CLI_UUID_NAMESPACE = "e6831f35-ca7a-4889-a7bf-541c81d58d40";
    var getLocalProjectId = async (namespace = AMPLIFY_CLI_UUID_NAMESPACE) => {
      const localProjectIdPath = process.cwd().replace((0, os_1.homedir)() + path_1.default.sep, "") + ".projectId";
      const configController = local_configuration_controller_factory_1.configControllerFactory.getInstance("usage_data_preferences.json");
      const cachedProjectId = await configController.get(localProjectIdPath);
      if (cachedProjectId) {
        return cachedProjectId;
      }
      const projectId = (0, uuid_1.v5)(Date.now().toString(), namespace);
      await configController.set(localProjectIdPath, projectId);
      return projectId;
    };
    exports2.getLocalProjectId = getLocalProjectId;
  }
});

// node_modules/@aws-amplify/platform-core/lib/telemetry/account_id_fetcher.js
var require_account_id_fetcher2 = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/telemetry/account_id_fetcher.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AccountIdFetcher = void 0;
    var client_sts_1 = require("@aws-sdk/client-sts");
    var uuid_1 = require_cjs2();
    var AMPLIFY_CLI_UUID_NAMESPACE = "283cae3e-c611-4659-9044-6796e5d696ec";
    var AccountIdFetcher = class {
      stsClient;
      accountIdPromise;
      /**
       * constructor for AccountIdFetcher
       */
      constructor(stsClient = new client_sts_1.STSClient()) {
        this.stsClient = stsClient;
      }
      fetch = async () => {
        if (this.accountIdPromise) {
          try {
            const stsResponse = await this.accountIdPromise;
            return this.getAccountIdFromStsResponse(stsResponse);
          } catch {
            return;
          }
        }
        try {
          this.accountIdPromise = this.stsClient.send(new client_sts_1.GetCallerIdentityCommand({}));
          const stsResponse = await this.accountIdPromise;
          return this.getAccountIdFromStsResponse(stsResponse);
        } catch {
          return;
        }
      };
      getAccountIdFromStsResponse = (stsResponse) => {
        if (stsResponse && stsResponse.Account) {
          return (0, uuid_1.v5)(stsResponse.Account.slice(0, -2), AMPLIFY_CLI_UUID_NAMESPACE);
        }
        return;
      };
    };
    exports2.AccountIdFetcher = AccountIdFetcher;
  }
});

// node_modules/@aws-amplify/platform-core/lib/telemetry/region_fetcher.js
var require_region_fetcher = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/telemetry/region_fetcher.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RegionFetcher = void 0;
    var client_sts_1 = require("@aws-sdk/client-sts");
    var RegionFetcher = class {
      stsClient;
      regionPromise;
      /**
       * constructor for RegionFetcher
       */
      constructor(stsClient = new client_sts_1.STSClient()) {
        this.stsClient = stsClient;
      }
      fetch = async () => {
        if (this.regionPromise) {
          return await this.regionPromise;
        }
        try {
          this.regionPromise = this.stsClient.config.region();
          return await this.regionPromise;
        } catch {
          return;
        }
      };
    };
    exports2.RegionFetcher = RegionFetcher;
  }
});

// node_modules/@aws-amplify/platform-core/lib/telemetry/serializable_error.js
var require_serializable_error2 = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/telemetry/serializable_error.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SerializableError = void 0;
    var path_1 = __importDefault(require("path"));
    var url_1 = require("url");
    var os_1 = require("os");
    var SerializableError = class {
      name;
      message;
      stack;
      // breakdown of filePathRegex:
      // (file:/+)? -> matches optional file url prefix
      // homedir()/process.cwd() -> users home directory or current working directory, replacing \ with /
      // [\\w.\\-_@\\\\/]+ -> matches nested directories and file name
      filePathRegex = new RegExp(`(file:/+)?(${(0, os_1.homedir)().replaceAll("\\", "/")}|${process.cwd().replaceAll("\\", "/")})[\\w.\\-_@\\\\/]+`, "g");
      arnRegex = /arn:[a-z0-9][-.a-z0-9]{0,62}:[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,1023}/g;
      stackRegex = /amplify-[a-zA-Z0-9-]+/g;
      /**
       * constructor for SerializableError
       */
      constructor(error) {
        this.name = "code" in error && error.code ? this.sanitize(error.code) : error.name;
        this.message = this.anonymizePaths(this.sanitize(error.message));
        this.stack = error.stack ? this.anonymizePaths(this.sanitize(error.stack)) : "";
      }
      anonymizePaths = (str) => {
        let result = str;
        const matches = [...result.matchAll(this.filePathRegex)];
        for (const match of matches) {
          result = result.replace(match[0], this.processPaths([match[0]])[0]);
        }
        return result;
      };
      processPaths = (paths) => {
        return paths.map((tracePath) => {
          let result = tracePath;
          if (this.isURLFilePath(result)) {
            result = (0, url_1.fileURLToPath)(result);
          }
          if (path_1.default.isAbsolute(result)) {
            return path_1.default.relative(process.cwd(), result);
          }
          return result;
        });
      };
      removeARN = (str) => {
        return str?.replace(this.arnRegex, "<escaped ARN>") ?? "";
      };
      removeStack = (str) => {
        return str?.replace(this.stackRegex, "<escaped stack>") ?? "";
      };
      sanitize = (str) => {
        let result = str;
        result = this.removeARN(result);
        result = this.removeStack(result);
        return result.replaceAll(/["❌]/g, "");
      };
      isURLFilePath = (path) => {
        try {
          new URL(path);
          return path.startsWith("file:");
        } catch {
          return false;
        }
      };
    };
    exports2.SerializableError = SerializableError;
  }
});

// node_modules/@aws-amplify/platform-core/lib/telemetry/translate_error_to_telemetry_error_details.js
var require_translate_error_to_telemetry_error_details = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/telemetry/translate_error_to_telemetry_error_details.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.translateErrorToTelemetryErrorDetails = void 0;
    var serializable_error_1 = require_serializable_error2();
    var translateErrorToTelemetryErrorDetails = (error) => {
      if (!error) {
        return void 0;
      }
      let currentError = error;
      let errorDetails;
      try {
        while (currentError) {
          const serializedError = new serializable_error_1.SerializableError(currentError);
          const errorDetail = {
            name: serializedError.name,
            message: serializedError.message,
            stack: serializedError.stack ?? ""
          };
          if (errorDetails) {
            errorDetail.caused = errorDetails;
          }
          errorDetails = errorDetail;
          currentError = currentError.cause;
        }
      } catch {
        return errorDetails;
      }
      return errorDetails;
    };
    exports2.translateErrorToTelemetryErrorDetails = translateErrorToTelemetryErrorDetails;
  }
});

// node_modules/@aws-amplify/platform-core/lib/telemetry/telemetry_payload_exporter.js
var require_telemetry_payload_exporter = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/telemetry/telemetry_payload_exporter.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DefaultTelemetryPayloadExporter = void 0;
    var core_1 = require_src();
    var https_1 = __importDefault(require("https"));
    var is_ci_1 = __importDefault(require_is_ci());
    var os_1 = __importDefault(require("os"));
    var uuid_1 = require_cjs2();
    var get_telemetry_url_1 = require_get_telemetry_url();
    var telemetry_payload_1 = require_telemetry_payload();
    var constants_1 = require_constants4();
    var get_local_project_id_1 = require_get_local_project_id();
    var account_id_fetcher_1 = require_account_id_fetcher2();
    var region_fetcher_1 = require_region_fetcher();
    var translate_error_to_telemetry_error_details_1 = require_translate_error_to_telemetry_error_details();
    var errors_1 = require_errors();
    var DefaultTelemetryPayloadExporter = class {
      dependencies;
      payloadVersion;
      sessionId;
      url;
      accountIdFetcher;
      regionFetcher;
      isShutdown = false;
      spanQueue = [];
      dependenciesToReport;
      /**
       * Constructor for DefaultTelemetryPayloadExporter
       */
      constructor(dependencies, payloadVersion = constants_1.latestPayloadVersion, sessionId = (0, uuid_1.v4)(), url = (0, get_telemetry_url_1.getUrl)(), accountIdFetcher = new account_id_fetcher_1.AccountIdFetcher(), regionFetcher = new region_fetcher_1.RegionFetcher()) {
        this.dependencies = dependencies;
        this.payloadVersion = payloadVersion;
        this.sessionId = sessionId;
        this.url = url;
        this.accountIdFetcher = accountIdFetcher;
        this.regionFetcher = regionFetcher;
        const targetDependencies = [
          "@aws-amplify/ai-constructs",
          "@aws-amplify/auth-construct",
          "@aws-amplify/backend",
          "@aws-amplify/backend-ai",
          "@aws-amplify/backend-auth",
          "@aws-amplify/backend-cli",
          "@aws-amplify/backend-data",
          "@aws-amplify/backend-deployer",
          "@aws-amplify/backend-function",
          "@aws-amplify/backend-output-schemas",
          "@aws-amplify/backend-output-storage",
          "@aws-amplify/backend-secret",
          "@aws-amplify/backend-storage",
          "@aws-amplify/cli-core",
          "@aws-amplify/client-config",
          "@aws-amplify/deployed-backend-client",
          "@aws-amplify/form-generator",
          "@aws-amplify/model-generator",
          "@aws-amplify/platform-core",
          "@aws-amplify/plugin-types",
          "@aws-amplify/sandbox",
          "@aws-amplify/schema-generator",
          "@aws-amplify/seed",
          "aws-amplify",
          "aws-cdk",
          "aws-cdk-lib"
        ];
        this.dependenciesToReport = this.dependencies?.filter((dependency) => targetDependencies.includes(dependency.name));
      }
      export = async (spans, resultCallback) => {
        if (this.isShutdown) {
          resultCallback({ code: core_1.ExportResultCode.FAILED });
          return;
        }
        try {
          this.spanQueue.push(...spans);
          await this.sendSpans();
          resultCallback({ code: core_1.ExportResultCode.SUCCESS });
        } catch {
          resultCallback({ code: core_1.ExportResultCode.FAILED });
        }
      };
      shutdown = async () => {
        await this.sendSpans();
      };
      forceFlush = async () => {
        await this.sendSpans();
      };
      sendSpans = async () => {
        for (const span of this.spanQueue) {
          try {
            const payload = await this.getTelemetryPayload(span);
            if (payload) {
              await this.send(payload);
            }
          } catch {
          }
          this.spanQueue.shift();
        }
      };
      getTelemetryPayload = async (span) => {
        try {
          let payload;
          const basePayload = {
            identifiers: {
              payloadVersion: this.payloadVersion,
              sessionUuid: this.sessionId,
              eventId: (0, uuid_1.v4)(),
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              localProjectId: await (0, get_local_project_id_1.getLocalProjectId)(),
              accountId: await this.accountIdFetcher.fetch(),
              awsRegion: await this.regionFetcher.fetch()
            },
            environment: {
              os: {
                platform: os_1.default.platform(),
                release: os_1.default.release()
              },
              shell: os_1.default.userInfo().shell ?? "",
              npmUserAgent: process.env.npm_config_user_agent ?? "",
              ci: is_ci_1.default,
              memory: {
                total: os_1.default.totalmem(),
                free: os_1.default.freemem()
              }
            },
            project: {
              dependencies: this.dependenciesToReport
            }
          };
          if (Object.keys(span.attributes).length >= constants_1.telemetrySpanAttributeCountLimit) {
            payload = {
              ...basePayload,
              // to undo Partial typing on basePayload to ensure payload completeness
              event: {
                state: "FAILED",
                command: {
                  path: [],
                  parameters: []
                }
              },
              latency: { total: 0 },
              error: (0, translate_error_to_telemetry_error_details_1.translateErrorToTelemetryErrorDetails)(new errors_1.AmplifyFault("TelemetrySpanAttributeCountLimitFault", {
                message: `Telemetry span attribute count has hit the limit of ${constants_1.telemetrySpanAttributeCountLimit}`
              }))
            };
          } else {
            const unflattened = this.unflattenSpanAttributes(span.attributes);
            payload = {
              ...basePayload,
              // to undo Partial typing on basePayload to ensure payload completeness
              event: unflattened.event,
              latency: unflattened.latency,
              error: unflattened.error
            };
          }
          const parsedPayload = telemetry_payload_1.telemetryPayloadSchema.parse(payload);
          return parsedPayload;
        } catch {
          return;
        }
      };
      // Unflattens dot notation span attributes into telemetry payload
      unflattenSpanAttributes = (attributes) => {
        const result = {};
        for (const [flatKey, value] of Object.entries(attributes)) {
          const keys = flatKey.split(".");
          let current = result;
          for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current)) {
              current[key] = {};
            }
            current = current[key];
          }
          const lastKey = keys[keys.length - 1];
          current[lastKey] = value;
        }
        return result;
      };
      send = (data) => {
        return new Promise((resolve) => {
          const payload = JSON.stringify(data);
          const req = https_1.default.request({
            hostname: this.url.hostname,
            port: this.url.port,
            path: this.url.path,
            method: "POST",
            headers: {
              "content-type": "application/json",
              "content-length": payload.length
            }
          });
          req.on("error", () => {
          });
          req.setTimeout(2e3, () => {
            resolve();
          });
          req.write(payload);
          req.end(() => {
            resolve();
          });
        });
      };
    };
    exports2.DefaultTelemetryPayloadExporter = DefaultTelemetryPayloadExporter;
  }
});

// node_modules/@aws-amplify/platform-core/lib/telemetry/telemetry_span_processor_factory.js
var require_telemetry_span_processor_factory = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/telemetry/telemetry_span_processor_factory.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TelemetrySpanProcessorFactory = void 0;
    var sdk_trace_base_1 = require_src3();
    var local_configuration_controller_factory_1 = require_local_configuration_controller_factory();
    var constants_1 = require_constants4();
    var telemetry_payload_exporter_1 = require_telemetry_payload_exporter();
    var TelemetrySpanProcessorFactory = class {
      getInstance = async (dependencies) => {
        const configController = local_configuration_controller_factory_1.configControllerFactory.getInstance("usage_data_preferences.json");
        const telemetryTrackingDisabledLocalFile = await configController.get(constants_1.TELEMETRY_ENABLED) === false;
        if (process.env.AMPLIFY_DISABLE_TELEMETRY || telemetryTrackingDisabledLocalFile) {
          return new sdk_trace_base_1.NoopSpanProcessor();
        }
        return new sdk_trace_base_1.SimpleSpanProcessor(new telemetry_payload_exporter_1.DefaultTelemetryPayloadExporter(dependencies));
      };
    };
    exports2.TelemetrySpanProcessorFactory = TelemetrySpanProcessorFactory;
  }
});

// node_modules/@aws-amplify/platform-core/lib/telemetry/set_span_attributes.js
var require_set_span_attributes = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/telemetry/set_span_attributes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.setSpanAttributes = void 0;
    var setSpanAttributes = (span, obj, prefix = "") => {
      if (obj && typeof obj === "object") {
        for (const [key, value] of Object.entries(obj)) {
          if (value === void 0 || value === null) {
            continue;
          }
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (isAttributeValue(value)) {
            span.setAttribute(fullKey, value);
          } else if (typeof value === "object") {
            (0, exports2.setSpanAttributes)(span, value, fullKey);
          }
        }
      }
    };
    exports2.setSpanAttributes = setSpanAttributes;
    var isAttributeValue = (value) => {
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value) && value.every((val) => typeof val === "string" || typeof val === "number" || typeof val === "boolean");
    };
  }
});

// node_modules/@aws-amplify/platform-core/lib/index.js
var require_lib = __commonJS({
  "node_modules/@aws-amplify/platform-core/lib/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.telemetrySpanAttributeCountLimit = exports2.TELEMETRY_ENABLED = exports2.telemetryPayloadSchema = exports2.TagName = exports2.CDKContextKey = exports2.USAGE_DATA_TRACKING_ENABLED = void 0;
    __exportStar(require_backend_identifier_conversions(), exports2);
    __exportStar(require_backend_entry_point_locator(), exports2);
    __exportStar(require_caller_directory_extractor(), exports2);
    __exportStar(require_extract_file_path_from_stack_trace_line(), exports2);
    __exportStar(require_package_json_reader(), exports2);
    __exportStar(require_usage_data_emitter_factory(), exports2);
    __exportStar(require_local_configuration_controller_factory(), exports2);
    __exportStar(require_typed_configuration_file_factory(), exports2);
    __exportStar(require_errors(), exports2);
    var constants_js_1 = require_constants();
    Object.defineProperty(exports2, "USAGE_DATA_TRACKING_ENABLED", { enumerable: true, get: function() {
      return constants_js_1.USAGE_DATA_TRACKING_ENABLED;
    } });
    var cdk_context_key_js_1 = require_cdk_context_key();
    Object.defineProperty(exports2, "CDKContextKey", { enumerable: true, get: function() {
      return cdk_context_key_js_1.CDKContextKey;
    } });
    __exportStar(require_parameter_path_conversions(), exports2);
    __exportStar(require_object_accumulator(), exports2);
    var tag_name_js_1 = require_tag_name();
    Object.defineProperty(exports2, "TagName", { enumerable: true, get: function() {
      return tag_name_js_1.TagName;
    } });
    __exportStar(require_naming_convention_conversions(), exports2);
    __exportStar(require_telemetry_span_processor_factory(), exports2);
    var telemetry_payload_js_1 = require_telemetry_payload();
    Object.defineProperty(exports2, "telemetryPayloadSchema", { enumerable: true, get: function() {
      return telemetry_payload_js_1.telemetryPayloadSchema;
    } });
    __exportStar(require_set_span_attributes(), exports2);
    __exportStar(require_translate_error_to_telemetry_error_details(), exports2);
    var constants_js_2 = require_constants4();
    Object.defineProperty(exports2, "TELEMETRY_ENABLED", { enumerable: true, get: function() {
      return constants_js_2.TELEMETRY_ENABLED;
    } });
    Object.defineProperty(exports2, "telemetrySpanAttributeCountLimit", { enumerable: true, get: function() {
      return constants_js_2.telemetrySpanAttributeCountLimit;
    } });
  }
});

// node_modules/@aws-amplify/backend/lib/engine/backend-secret/lambda/backend_secret_fetcher.js
var backend_secret_fetcher_exports = {};
__export(backend_secret_fetcher_exports, {
  handleCreateUpdateEvent: () => handleCreateUpdateEvent,
  handler: () => handler
});
module.exports = __toCommonJS(backend_secret_fetcher_exports);

// node_modules/@aws-amplify/backend-secret/lib/secret_error.js
var import_client_ssm = require("@aws-sdk/client-ssm");
var SecretError = class _SecretError extends Error {
  cause;
  httpStatusCode;
  /**
   * Creates a secret error instance.
   */
  constructor(message, options) {
    super(message);
    this.name = "SecretError";
    this.cause = options?.cause;
    this.httpStatusCode = options?.httpStatusCode;
  }
  /**
   * Creates a secret error from an underlying cause.
   */
  static createInstance = (cause) => {
    if (cause instanceof import_client_ssm.SSMServiceException) {
      return _SecretError.fromSSMException(cause);
    }
    return new _SecretError(cause.message, { cause });
  };
  /**
   * Creates a secret error from an SSM exception.
   */
  static fromSSMException = (ssmException) => {
    return new _SecretError(JSON.stringify(ssmException), {
      cause: ssmException,
      httpStatusCode: ssmException.$metadata.httpStatusCode
    });
  };
};

// node_modules/@aws-amplify/backend-secret/lib/ssm_secret.js
var import_platform_core = __toESM(require_lib(), 1);
var SSMSecretClient = class {
  ssmClient;
  /**
   * Creates a new instance of SSMSecret.
   */
  constructor(ssmClient) {
    this.ssmClient = ssmClient;
  }
  /**
   * Get a secret from SSM parameter store.
   */
  getSecret = async (backendIdentifier, secretIdentifier) => {
    let secret;
    const name = import_platform_core.ParameterPathConversions.toParameterFullPath(backendIdentifier, secretIdentifier.name);
    try {
      const resp = await this.ssmClient.getParameter({
        Name: secretIdentifier.version ? `${name}:${secretIdentifier.version}` : name,
        WithDecryption: true
      });
      if (resp.Parameter?.Value) {
        secret = {
          name: secretIdentifier.name,
          version: resp.Parameter.Version,
          value: resp.Parameter.Value,
          lastUpdated: resp.Parameter.LastModifiedDate
        };
      }
    } catch (err) {
      throw SecretError.createInstance(err);
    }
    if (!secret) {
      throw new SecretError(`The value of secret '${secretIdentifier.name}' is undefined`);
    }
    return secret;
  };
  /**
   * List secrets from SSM parameter store.
   */
  listSecrets = async (backendIdentifier) => {
    const path = import_platform_core.ParameterPathConversions.toParameterPrefix(backendIdentifier);
    const result = [];
    try {
      let nextToken;
      do {
        const resp = await this.ssmClient.getParametersByPath({
          Path: path,
          WithDecryption: true,
          NextToken: nextToken
        });
        resp.Parameters?.forEach((param) => {
          if (!param.Name || !param.Value) {
            return;
          }
          const secretName = param.Name.split("/").pop();
          if (secretName) {
            result.push({
              name: secretName,
              version: param.Version,
              lastUpdated: param.LastModifiedDate
            });
          }
        });
        nextToken = resp.NextToken;
      } while (nextToken);
      return result;
    } catch (err) {
      throw SecretError.createInstance(err);
    }
  };
  /**
   * Set a secret in SSM parameter store.
   */
  setSecret = async (backendIdentifier, secretName, secretValue) => {
    const name = import_platform_core.ParameterPathConversions.toParameterFullPath(backendIdentifier, secretName);
    try {
      const resp = await this.ssmClient.putParameter({
        Name: name,
        Type: "SecureString",
        Value: secretValue,
        Description: `Amplify Secret`,
        Overwrite: true
      });
      return {
        name: secretName,
        version: resp.Version
      };
    } catch (err) {
      throw SecretError.createInstance(err);
    }
  };
  /**
   * Remove a secret from SSM parameter store.
   */
  removeSecret = async (backendIdentifier, secretName) => {
    const name = import_platform_core.ParameterPathConversions.toParameterFullPath(backendIdentifier, secretName);
    try {
      await this.ssmClient.deleteParameter({
        Name: name
      });
    } catch (err) {
      throw SecretError.createInstance(err);
    }
  };
  /**
   * Remove secrets from SSM parameter store.
   */
  removeSecrets = async (backendIdentifier, secretNames) => {
    const names = secretNames.map((secretName) => import_platform_core.ParameterPathConversions.toParameterFullPath(backendIdentifier, secretName));
    try {
      const resp = await this.ssmClient.deleteParameters({
        Names: names
      });
      if (resp.InvalidParameters && resp.InvalidParameters.length > 0) {
        throw new SecretError(`Failed to remove secrets: ${resp.InvalidParameters.join(", ")}`);
      }
    } catch (err) {
      if (err instanceof SecretError) {
        throw err;
      }
      throw SecretError.createInstance(err);
    }
  };
};

// node_modules/@aws-amplify/backend-secret/lib/secret.js
var import_client_ssm3 = require("@aws-sdk/client-ssm");

// node_modules/@aws-amplify/backend-secret/lib/ssm_secret_with_amplify_error_handling.js
var import_platform_core2 = __toESM(require_lib(), 1);
var import_client_ssm2 = require("@aws-sdk/client-ssm");

// node_modules/@aws-amplify/backend-secret/lib/secret.js
var getSecretClient = (secretClientOptions) => {
  return new SSMSecretClient(new import_client_ssm3.SSM({
    credentials: secretClientOptions?.credentials,
    region: secretClientOptions?.region
  }));
};

// node_modules/@aws-amplify/backend/lib/engine/backend-secret/lambda/backend_secret_fetcher.js
var import_node_crypto = require("node:crypto");
var secretClient = getSecretClient();
var handler = async (event) => {
  console.info(`Received '${event.RequestType}' event`);
  const physicalId = event.RequestType === "Create" ? (0, import_node_crypto.randomUUID)() : event.PhysicalResourceId;
  let data = void 0;
  if (event.RequestType === "Update" || event.RequestType === "Create") {
    const secretMap = await handleCreateUpdateEvent(secretClient, event);
    data = {
      ...secretMap
    };
  }
  return {
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    PhysicalResourceId: physicalId,
    Data: data,
    StackId: event.StackId,
    NoEcho: true,
    Status: "SUCCESS"
  };
};
var handleCreateUpdateEvent = async (secretClient2, event) => {
  const props = event.ResourceProperties;
  const secretMap = {};
  for (const secretName of props.secretNames) {
    let secretValue = void 0;
    try {
      const resp = await secretClient2.getSecret({
        namespace: props.namespace,
        name: props.name,
        type: props.type
      }, {
        name: secretName
      });
      secretValue = resp.value;
    } catch (err) {
      const secretErr = err;
      if (secretErr.httpStatusCode && secretErr.httpStatusCode >= 500) {
        throw new Error(`Failed to retrieve backend secret '${secretName}' for '${props.namespace}/${props.name}'. Reason: ${JSON.stringify(err)}`, { cause: secretErr });
      }
    }
    if (!secretValue) {
      try {
        const resp = await secretClient2.getSecret(props.namespace, {
          name: secretName
        });
        secretValue = resp.value;
      } catch (err) {
        throw new Error(`Failed to retrieve backend secret '${secretName}' for '${props.namespace}'. Reason: ${JSON.stringify(err)}`, { cause: err });
      }
    }
    if (!secretValue) {
      throw new Error(`Unable to find backend secret for backend '${props.namespace}', branch '${props.name}', name '${secretName}'`);
    }
    secretMap[secretName] = secretValue;
  }
  return secretMap;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handleCreateUpdateEvent,
  handler
});
