'use strict'

const _ = require('lodash');
const program = require('commander');
const fs = require('fs');
const aws = require('aws-sdk');


const textract = new aws.Textract();

const getText = (result, blocksMap) => {
    let text = "";

    if (_.has(result, "Relationships")) {
        result.Relationships.forEach(relationship => {
            if (relationship.Type === "CHILD") {
                relationship.Ids.forEach(childId => {
                    const word = blocksMap[childId];
                    if (word.BlockType === "WORD") {
                        text += `${word.Text} `;
                    }
                    if (word.BlockType === "SELECTION_ELEMENT") {
                        if (word.SelectionStatus === "SELECTED") {
                            text += `X `;
                        }
                    }
                });
            }
        });
    }

    return text.trim();
};

const findValueBlock = (keyBlock, valueMap) => {
    let valueBlock;
    keyBlock.Relationships.forEach(relationship => {
        if (relationship.Type === "VALUE") {

            relationship.Ids.every(valueId => {
                if (_.has(valueMap, valueId)) {
                    valueBlock = valueMap[valueId];
                    return false;
                }
            });
        }
    });

    return valueBlock;
};

const getKeyValueRelationship = (keyMap, valueMap, blockMap) => {
    const keyValues = {};

    const keyMapValues = _.values(keyMap);
    keyMapValues.forEach(keyMapValue => {
        const valueBlock = findValueBlock(keyMapValue, valueMap);
        const key = getText(keyMapValue, blockMap);
        const value = getText(valueBlock, blockMap);
        keyValues[key] = value;
    });

    return keyValues;
};

const getKeyValueMap = blocks => {
    const keyMap = {};
    const valueMap = {};
    const blockMap = {};

    let blockId;
    blocks.forEach(block => {
        blockId = block.Id;
        blockMap[blockId] = block;

        if (block.BlockType === "KEY_VALUE_SET") {
            if (_.includes(block.EntityTypes, "KEY")) {
                keyMap[blockId] = block;
            } else {
                valueMap[blockId] = block;
            }
        }
    });

    return { keyMap, valueMap, blockMap };
};


// textract lambda reespuesta del textract
module.exports.textract = async(event, context, callback) => {
    var s3 = new AWS.S3();
    var params = JSON.parse(event.body);

    var s3Params = {
        Bucket: 'contratosingsoftwaremike',
        Key: params.name,
        ContentType: params.type,
        ACL: 'public-read',
    };

    var filePath = s3.getSignedUrl('putObject', s3Params);
    var data = fs.readFileSync(filePath);
    const params = {
        Document: {
            Bytes: data
        },
        FeatureTypes: ["FORMS"]
    };

    const request = textract.analyzeDocument(params);
    const data = await request.promise();

    if (data && data.Blocks) {
        const { keyMap, valueMap, blockMap } = getKeyValueMap(data.Blocks);
        const keyValues = getKeyValueRelationship(keyMap, valueMap, blockMap);

        const response = {
            message: 'Operación completada exitosamente.',
            statusCode: 200,
            body: JSON.stringify(keyValues)
        };
        //---------
        callback(null, {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                uploadURL: uploadURL,
                result: response
            })
        })
        return;
    }

    return undefined;
}