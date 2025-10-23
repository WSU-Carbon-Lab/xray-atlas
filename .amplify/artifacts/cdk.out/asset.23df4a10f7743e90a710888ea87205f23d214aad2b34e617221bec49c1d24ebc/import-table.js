"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeTableProperties = exports.getImportedTableComparisonProperties = exports.getExpectedTableProperties = exports.validateImportedTableProperties = exports.importTable = void 0;
const lodash_isequal_1 = __importDefault(require("lodash.isequal"));
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const importTable = async (createTableInput) => {
    const ddbClient = new client_dynamodb_1.DynamoDB();
    console.log('Initiating table import process');
    console.log(`Fetching current state of table ${createTableInput.TableName}`);
    const describeTableResult = await ddbClient.describeTable({ TableName: createTableInput.TableName });
    if (!describeTableResult.Table) {
        throw new Error(`Could not find ${createTableInput.TableName} to update`);
    }
    console.log('Current table state: ', describeTableResult);
    const expectedTableProperties = (0, exports.getExpectedTableProperties)(createTableInput);
    const importedTableProperties = (0, exports.getImportedTableComparisonProperties)(describeTableResult.Table);
    (0, exports.validateImportedTableProperties)(importedTableProperties, expectedTableProperties);
    const result = {
        PhysicalResourceId: describeTableResult.Table.TableName,
        Data: {
            TableArn: describeTableResult.Table.TableArn,
            TableStreamArn: describeTableResult.Table.LatestStreamArn,
            TableName: describeTableResult.Table.TableName,
        },
    };
    console.log('Returning result: ', result);
    return result;
};
exports.importTable = importTable;
const validateImportedTableProperties = (importedTableProperties, expectedTableProperties) => {
    const errors = [];
    const assertEqual = (propertyName, imported, expected) => {
        if (!(0, lodash_isequal_1.default)(imported, expected)) {
            errors.push(`${propertyName} does not match the expected value.\nImported Value: ${JSON.stringify(imported)}\nExpected: ${JSON.stringify(expected)}`);
        }
    };
    const sanitizedImportedTableProperties = (0, exports.sanitizeTableProperties)(importedTableProperties);
    const sanitizedExpectedTableProperties = (0, exports.sanitizeTableProperties)(expectedTableProperties);
    assertEqual('AttributeDefinitions', sanitizedImportedTableProperties.AttributeDefinitions, sanitizedExpectedTableProperties.AttributeDefinitions);
    assertEqual('KeySchema', sanitizedImportedTableProperties.KeySchema, sanitizedExpectedTableProperties.KeySchema);
    assertEqual('GlobalSecondaryIndexes', sanitizedImportedTableProperties.GlobalSecondaryIndexes, sanitizedExpectedTableProperties.GlobalSecondaryIndexes);
    assertEqual('BillingModeSummary', sanitizedImportedTableProperties.BillingModeSummary, sanitizedExpectedTableProperties.BillingModeSummary);
    assertEqual('ProvisionedThroughput', sanitizedImportedTableProperties.ProvisionedThroughput, sanitizedExpectedTableProperties.ProvisionedThroughput);
    assertEqual('StreamSpecification', sanitizedImportedTableProperties.StreamSpecification, sanitizedExpectedTableProperties.StreamSpecification);
    assertEqual('SSEDescription', sanitizedImportedTableProperties.SSEDescription, sanitizedExpectedTableProperties.SSEDescription);
    assertEqual('DeletionProtectionEnabled', sanitizedImportedTableProperties.DeletionProtectionEnabled, sanitizedExpectedTableProperties.DeletionProtectionEnabled);
    if (errors.length > 0) {
        throw new Error(`Imported table properties did not match the expected table properties.\n${errors.join('\n')}`);
    }
};
exports.validateImportedTableProperties = validateImportedTableProperties;
const getExpectedTableProperties = (createTableInput) => {
    return {
        AttributeDefinitions: getExpectedAttributeDefinitions(createTableInput),
        KeySchema: getExpectedKeySchema(createTableInput),
        GlobalSecondaryIndexes: getExpectedGlobalSecondaryIndexes(createTableInput),
        BillingModeSummary: getExpectedBillingModeSummary(createTableInput),
        ProvisionedThroughput: getExpectedProvisionedThroughput(createTableInput),
        StreamSpecification: getExpectedStreamSpecification(createTableInput),
        SSEDescription: getExpectedSSEDescription(createTableInput),
        DeletionProtectionEnabled: getExpectedDeletionProtectionEnabled(createTableInput),
    };
};
exports.getExpectedTableProperties = getExpectedTableProperties;
const getExpectedAttributeDefinitions = (createTableInput) => {
    return createTableInput.AttributeDefinitions;
};
const getExpectedKeySchema = (createTableInput) => {
    return createTableInput.KeySchema;
};
const getExpectedGlobalSecondaryIndexes = (createTableInput) => {
    var _a;
    return (_a = createTableInput.GlobalSecondaryIndexes) === null || _a === void 0 ? void 0 : _a.map((gsi) => {
        if (createTableInput.BillingMode === 'PAY_PER_REQUEST') {
            return {
                ...gsi,
                ProvisionedThroughput: gsi.ProvisionedThroughput
                    ? {
                        ReadCapacityUnits: 0,
                        WriteCapacityUnits: 0,
                    }
                    : undefined,
            };
        }
        return gsi;
    });
};
const getExpectedBillingModeSummary = (createTableInput) => {
    return {
        BillingMode: createTableInput.BillingMode,
    };
};
const getExpectedStreamSpecification = (createTableInput) => {
    return createTableInput.StreamSpecification;
};
const getExpectedProvisionedThroughput = (createTableInput) => {
    return createTableInput.ProvisionedThroughput || { ReadCapacityUnits: 0, WriteCapacityUnits: 0 };
};
const getExpectedSSEDescription = (createTableInput) => {
    return createTableInput.SSESpecification && createTableInput.SSESpecification.Enabled
        ? {
            SSEType: createTableInput.SSESpecification.SSEType || 'KMS',
            Status: 'ENABLED',
        }
        : undefined;
};
const getExpectedDeletionProtectionEnabled = (createTableInput) => {
    return createTableInput.DeletionProtectionEnabled || false;
};
const getImportedTableComparisonProperties = (importedTable) => {
    return {
        AttributeDefinitions: getAttributeDefinitionsForComparison(importedTable),
        KeySchema: getKeySchemaForComparison(importedTable),
        GlobalSecondaryIndexes: getGlobalSecondaryIndexesForComparison(importedTable),
        BillingModeSummary: getBillingModeSummaryForComparison(importedTable),
        ProvisionedThroughput: getProvisionedThroughputForComparison(importedTable),
        StreamSpecification: getStreamSpecificationForComparison(importedTable),
        SSEDescription: getSSEDescriptionForComparison(importedTable),
        DeletionProtectionEnabled: getDeletionProtectionEnabledForComparison(importedTable),
    };
};
exports.getImportedTableComparisonProperties = getImportedTableComparisonProperties;
const getAttributeDefinitionsForComparison = (importedTable) => {
    var _a;
    return (_a = importedTable.AttributeDefinitions) === null || _a === void 0 ? void 0 : _a.map((attributeDefinition) => ({
        AttributeName: attributeDefinition.AttributeName,
        AttributeType: attributeDefinition.AttributeType,
    }));
};
const getKeySchemaForComparison = (importedTable) => {
    var _a;
    return (_a = importedTable.KeySchema) === null || _a === void 0 ? void 0 : _a.map((key) => ({
        AttributeName: key.AttributeName,
        KeyType: key.KeyType,
    }));
};
const getGlobalSecondaryIndexesForComparison = (importedTable) => {
    var _a;
    return (_a = importedTable.GlobalSecondaryIndexes) === null || _a === void 0 ? void 0 : _a.map((gsi) => {
        var _a;
        return ({
            IndexName: gsi.IndexName,
            KeySchema: (_a = gsi.KeySchema) === null || _a === void 0 ? void 0 : _a.map((key) => ({
                AttributeName: key.AttributeName,
                KeyType: key.KeyType,
            })),
            OnDemandThroughput: gsi.OnDemandThroughput
                ? {
                    MaxReadRequestUnits: gsi.OnDemandThroughput.MaxReadRequestUnits,
                    MaxWriteRequestUnits: gsi.OnDemandThroughput.MaxWriteRequestUnits,
                }
                : undefined,
            Projection: gsi.Projection
                ? {
                    NonKeyAttributes: gsi.Projection.NonKeyAttributes,
                    ProjectionType: gsi.Projection.ProjectionType,
                }
                : undefined,
            ProvisionedThroughput: gsi.ProvisionedThroughput
                ? {
                    ReadCapacityUnits: gsi.ProvisionedThroughput.ReadCapacityUnits,
                    WriteCapacityUnits: gsi.ProvisionedThroughput.WriteCapacityUnits,
                }
                : undefined,
        });
    });
};
const getBillingModeSummaryForComparison = (importedTable) => {
    return importedTable.BillingModeSummary
        ? {
            BillingMode: importedTable.BillingModeSummary.BillingMode,
        }
        : undefined;
};
const getProvisionedThroughputForComparison = (importedTable) => {
    return importedTable.ProvisionedThroughput
        ? {
            ReadCapacityUnits: importedTable.ProvisionedThroughput.ReadCapacityUnits,
            WriteCapacityUnits: importedTable.ProvisionedThroughput.WriteCapacityUnits,
        }
        : undefined;
};
const getStreamSpecificationForComparison = (importedTable) => {
    var _a, _b;
    return importedTable.StreamSpecification
        ? {
            StreamEnabled: (_a = importedTable.StreamSpecification) === null || _a === void 0 ? void 0 : _a.StreamEnabled,
            StreamViewType: (_b = importedTable.StreamSpecification) === null || _b === void 0 ? void 0 : _b.StreamViewType,
        }
        : undefined;
};
const getSSEDescriptionForComparison = (importedTable) => {
    return importedTable.SSEDescription
        ? {
            SSEType: importedTable.SSEDescription.SSEType,
        }
        : undefined;
};
const getDeletionProtectionEnabledForComparison = (importedTable) => {
    return importedTable.DeletionProtectionEnabled;
};
const sanitizeTableProperties = (tableProperties) => {
    const tablePropertiesUndefinedRemoved = JSON.parse(JSON.stringify(tableProperties));
    if (tablePropertiesUndefinedRemoved.AttributeDefinitions) {
        tablePropertiesUndefinedRemoved.AttributeDefinitions.sort((a, b) => { var _a, _b; return ((_a = a.AttributeName) !== null && _a !== void 0 ? _a : '').localeCompare((_b = b.AttributeName) !== null && _b !== void 0 ? _b : ''); });
    }
    const sortKeySchema = (a, b) => { var _a, _b; return ((_a = a.AttributeName) !== null && _a !== void 0 ? _a : '').localeCompare((_b = b.AttributeName) !== null && _b !== void 0 ? _b : ''); };
    if (tablePropertiesUndefinedRemoved.KeySchema) {
        tablePropertiesUndefinedRemoved.KeySchema.sort(sortKeySchema);
    }
    if (tablePropertiesUndefinedRemoved.GlobalSecondaryIndexes) {
        tablePropertiesUndefinedRemoved.GlobalSecondaryIndexes.sort((a, b) => { var _a, _b; return ((_a = a.IndexName) !== null && _a !== void 0 ? _a : '').localeCompare((_b = b.IndexName) !== null && _b !== void 0 ? _b : ''); });
        tablePropertiesUndefinedRemoved.GlobalSecondaryIndexes.forEach((gsi) => {
            if (gsi.KeySchema) {
                gsi.KeySchema.sort(sortKeySchema);
            }
        });
    }
    return tablePropertiesUndefinedRemoved;
};
exports.sanitizeTableProperties = sanitizeTableProperties;
//# sourceMappingURL=import-table.js.map