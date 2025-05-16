import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import FormData from 'form-data';
import cors from 'cors';
import axios from'axios';
///////
import fs from 'fs';

/////////////
import xml2js from 'xml2js'; 
import { DOMParser } from 'xmldom';
const app = express();
const PORT = 3003;
//
import xmlParser from 'express-xml-bodyparser';
app.use(xmlParser());
app.use(express.json()); 
app.use(bodyParser.json());

app.use(cors()); 

const CAMUNDA_ENGINE_URL = 'https://uatcamunda.omfysgroup.com/engine-rest';
//const CAMUNDA_ENGINE_URL = 'http://localhost:8080/engine-rest';
app.get('/api/get-dmn', async (req, res) => {
    console.log('First DMN  Loading API');
      try {
          const response = await fetch(`${CAMUNDA_ENGINE_URL}/decision-definition/key/NewYear_Main_CN/xml`);
          if (!response.ok) {
              throw new Error('Failed to fetch DMN XML from Camunda.');
          }
          const data = await response.json();
         res.send(data.dmnXml ); 
      } catch (error) {
          console.error('Error fetching DMN:', error);
          res.status(500).send({ error: 'Failed to fetch DMN XML.' });
      }
  });
app.post('/api/save-dmn', async (req, res) => {
    console.log('within save API');
    try {
        let dmnXml = req.rawBody; 
        console.log('dmnXml for save ',  req.rawBody);
      
        const formData = new FormData();
        formData.append('deployment-name', 'updated-dmn-deployment');
        formData.append('enable-duplicate-filtering', 'true');
        formData.append('dmn', Buffer.from(dmnXml, 'utf-8'), 'BSAT_R3_NewYear.dmn');
  
        const response = await fetch(`${CAMUNDA_ENGINE_URL}/deployment/create`, {
            method: 'POST',
            body: formData,
        });
  
        if (response.ok) {
            res.send({ message: 'DMN deployed successfully!' });
            
        } else {
            const errorText = await response.text();
            console.error('Failed to deploy DMN:', errorText);
            res.status(500).send({ error: 'Failed to deploy DMN.' });
        }
    } catch (error) {
        console.error('Error saving DMN:', error);
        res.status(500).send({ error: 'An error occurred while saving the DMN.' });
    }
  });
  
  
app.get('/api/get-version-ids', async (req, res) => {
    console.log('Within version Loading API');
    try {
       const url = `https://uatcamunda.omfysgroup.com/engine-rest/decision-definition?key=NewYear_Prod`;
       //const url = `http://localhost:8080/engine-rest/decision-definition?key=NewYear_Prod`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch decision definitions from Camunda.');
        }
        const decisionDefinitions = await response.json();
        console.log(decisionDefinitions)
        if (decisionDefinitions.length === 0) {
            return res.status(404).send({ error: 'No decision definitions found for the given key.' });
        }
        const versionIdss = decisionDefinitions.map(definition => ({
            version: definition.version,
            resource: definition.resource
        }));
        console.log()
              const updatedDecisionVersionIds = versionIdss.filter(def => def.resource === 'BSAT_R3_NewYear.dmn');
  const versionIds = updatedDecisionVersionIds.sort((a, b) => b.version - a.version);
 // console.log(versionIds);
        res.json({ versionIds });
    } catch (error) {
        console.error('Error fetching decision definitions:', error);
        res.status(500).send({ error: 'Failed to fetch version IDs from Camunda.' });
    }
  });

  app.get('/api/get-versiontrackerlist', async (req, res) => { 
  console.log('Within version tracker API');
  try {
      const response = await fetch('https://demo.omfysgroup.com/bsat-r3/scheme/views_Versionlist3');
      if (!response.ok) {
          throw new Error('Failed to fetch version list.');
      }

      const data = await response.json();
      console.log('Fetched data:', data); 
      const SortedData=  data.sort((a, b) => b.version_Id - a.version_Id);
      console.log(SortedData);
      res.json(SortedData);

  } catch (err) {
      console.error('Error fetching version data:', err);
      res.status(500).json({ error: 'Error fetching version data.' });
  }
});
app.post('/api/get-dep-id-XML', async (req, res) => {
    console.log('Within version wise DMN Loading API');
    const versionId = req.body.version;
    console.log(`Version selected in post API in dmn : ${versionId}`);
    try {
       const decisionResponse = await fetch(`${CAMUNDA_ENGINE_URL}/decision-definition?key=NewYear_Prod&versionId=${encodeURIComponent(versionId)}`);
  
       if (!decisionResponse.ok) {
           return res.status(decisionResponse.status).json({ error: 'Failed to fetch decision definitions' });
       }
       const decisionDefinitions = await decisionResponse.json();
   try{
           if (Array.isArray(decisionDefinitions) && decisionDefinitions.length > 0) {
               const filteredDecision = decisionDefinitions.find(def => def.key === 'NewYear_Prod' && def.version === parseInt(versionId, 10));
               if (filteredDecision) {
                   const { id, key, version, decisionRequirementsDefinitionId, decisionRequirementsDefinitionKey, deploymentId } = filteredDecision;
                  const dmnXmlResponse = await fetch(`${CAMUNDA_ENGINE_URL}/decision-definition/${id}/xml`);
                  if (!dmnXmlResponse.ok) {
                      return res.status(dmnXmlResponse.status).json({ error: 'Failed to fetch DMN XML' });
                  }
                  const dmnXmlData = await dmnXmlResponse.json();
             res.send(dmnXmlData.dmnXml); 
            } else {
                res.status(404).json({ error: 'No decision definitions found for the provided version' });
            }
          }
        } catch (err) {
            console.error('Error processing request matched for match:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'An error occurred while processing the request' });
            }
        }
    }catch (err) {
            console.error('Error processing request matched for match:', err);
        }
  
  });

app.post('/api/select-version', async (req, res) => {
    console.log('Within select version API');
      console.log('Request Body:', req.body); 
      const version = req.body.version;
      console.log(`Version selected in post API : ${version}`);
      if (!version) {
          return res.status(400).json({ error: 'Version is required' });
      }
      res.json({ id: version });  
  });
app.post('/api/get-comment', async (req, res) => {
    console.log('Within Get comment API');
    const versionid=req.body.version;
   console.log(' Response: ', versionid);
      if (!versionid) {
          return res.status(400).json({ error: 'Version id is required' });
      }
      try {
          const response = await fetch(`https://demo.omfysgroup.com/bsat-r3/scheme/views_Versionlist_data3?version_id=${versionid}`);
          console.log('within version');
          //  console.log('Response version ------------',response );
         let comments = "No comment found for the given VersionId"; 
         let version_Id;
         try {
           const cmnt = await response.json();
           console.log('Comments------------',cmnt );
           comments = cmnt[0].comments || "No comment found for the given VersionId";
           console.log('First Comment: ', comments);
         
            version_Id = cmnt[0].version_Id;
           console.log('First Id: ', version_Id);
         } catch (error) {
           console.error('Error parsing JSON:', error);
           console.log('First Comment: ', comments);
           console.log('First version_Id: ', version_Id); 
         }
          return res.json({comments ,version_Id });
      } catch (error) {
          console.error('Error making external request:', error);
          return res.status(500).json({ error: 'Error fetching comments' });
      } 
  });
  
  
  app.post('/api/set-comment-id', async (req, res) => {
    console.log('Within set comment API');
    const { version_Id, comments } = req.body;
    if (!version_Id) {
        return res.status(400).json({ error: 'Version is required' });
    }
    if (!comments) {
        return res.status(400).json({ error: 'Comments are required' });
    }
    try {
        const payload = {
          version_Id: version_Id,
            comments: comments
        };
        const response = await fetch('https://demo.omfysgroup.com/bsat-r3/scheme/saveVersion3', {
            method: 'POST',  
            headers: {
                'Content-Type': 'application/json',  
            },
            body: JSON.stringify(payload)  
        });
  
        const responseBody = await response.text();
   console.log('responseBody-----------',responseBody);
        if (response.status === 201) {
            console.log('External API Response:', responseBody);
            return res.status(201).json({
                success: true,
                message: 'Data saved successfully',
                externalStatusCode: response.status,
                externalResponseBody: responseBody
            });
        } else {
            console.error('External API Error:', responseBody);
            return res.status(response.status).json({
                error: responseBody,
                externalStatusCode: response.status,
                externalResponseBody: responseBody
            });
        }
  
    } catch (error) {
        console.error('Error making external request:', error);
        return res.status(500).json({
            error: 'Error fetching comments from external service',
            externalStatusCode: 500,
            externalResponseBody: error.message
        });
    }
  });

  
app.post('/api/save-dmn-ForValidate', async (req, res) => {
    console.log('within validation API');
    try {
      let dmnXml = req.rawBody; 
      console.log('XML ',dmnXml);
      let validationErrors = []; 
      async function parseDmnXml(dmnXml) {
        const parser = new xml2js.Parser();
        try {
          const result = await parser.parseStringPromise(dmnXml);
          return result;
        } catch (error) {
          console.error('Error parsing DMN XML:', error);
          return null;
        }
      }
      async function extractAndValidateFeelExpressions(dmnXml) {
        const dmnData = await parseDmnXml(dmnXml);
        if (!dmnData) return;
        const decisions = dmnData.definitions.decision;
        decisions.forEach(decision => {
          const decisionTables = decision.decisionTable;
          decisionTables.forEach(decisionTable => {
            const inputs = decisionTable.input || [];
            const outputs = decisionTable.output || [];
  var LineNo_DMN=0;
            decisionTable.rule.forEach(rule => {
              const inputColumnNames = inputs.map(input => input.$.label);
              const outputColumnNames = outputs.map(output => output.$.label);
              LineNo_DMN=LineNo_DMN+1;
              inputs.forEach((input, index) => {
                const inputExpression = input.inputExpression[0];
                const inputType = inputExpression.$.typeRef;
                const inputColumnName = input.$.label;
                const inputEntry = rule.inputEntry[index];
                const inputValue = inputEntry ? inputEntry.text[0] : null;
                if (shouldSkipValidation(inputValue, inputColumnName, outputColumnNames)) {
                  console.log(`⏸️ Skipping validation for input "${inputColumnName}" as it contains an output column name or has a related function.`);
                  return;
                }
                if (inputValue === '-' || inputValue === inputColumnName) {
                  console.log(`⏸️ Skipping validation for input "${inputColumnName}" with value "${inputValue}".`);
                  return;
                }
                if (inputValue) {
                  const typeMismatch = validateDataType(inputValue, inputType);
                  if (!typeMismatch.valid) {
                    const errorMsg = `⚠️ Data type mismatch for input "${inputValue}" in the column "${inputColumnName}" at Line No "${LineNo_DMN}". Expected input type "${inputType}".`;      
                                validationErrors.push(errorMsg); 
                                 console.log(errorMsg);
                  }
                }
              });
              outputs.forEach((output, index) => {
                const outputType = output.$.typeRef;
                const outputColumnName = output.$.label;
                const outputEntry = rule.outputEntry[index];
                const outputValue = outputEntry ? outputEntry.text[0] : null;
                if (inputColumnNames.includes(outputColumnName)) {
                  return; 
                }
                if (outputValue === '-' || outputValue === outputColumnName) {
                  console.log(`⏸️ Skipping validation for output "${outputColumnName}" with value "${outputValue}".`);
                  console.log(`⏸️ Skipping validation for output "${outputColumnName}" with value "${outputValue}" in "${outputColumnName}".`);
                  return;
                }
                if (shouldSkipValidationForOutput(outputValue, inputColumnNames)) {
                  return;
                }
                if (outputValue) {
                  const typeMismatch = validateDataType(outputValue, outputType);
                  if (!typeMismatch.valid) {
                   const errorMsg =  `⚠️ Data type mismatch for output "${outputValue}" in the column "${outputColumnName}" at Line No "${LineNo_DMN}". Expected input type "${outputType}".`;
                   validationErrors.push(errorMsg);
                    console.log(errorMsg);
                  }
                }
              });
            });
          });
        });
      }
      function shouldSkipValidation(value, columnName, outputColumnNames) {
        if (value === columnName || outputColumnNames.some(output => value.includes(output))) {
          return true;
        }
        return false;
      }
      function shouldSkipValidationForOutput(outputValue, inputColumnNames) {
        if (inputColumnNames.some(input => outputValue.includes(input))) {
          return true;
        }
        return false;
      }
      function validateDataType(value, expectedType) {
        switch (expectedType) {
          case 'string':
            if (/^".*"$/.test(value)) {
              return { valid: true };
            } else {
              return { valid: false, message: 'Expected a string in double quotes (e.g., "A").' };
            }
          case 'boolean':
            if (value === 'true' || value === 'false') {
              return { valid: true };
            } else {
              return { valid: false, message: 'Expected a boolean ("true" or "false").' };
            }
          case 'integer':
            if (/^-?\d+$/.test(value)) {
              return { valid: true };
            } else {
              return { valid: false, message: 'Expected an integer (e.g., 100).' };
            }
          case 'double':
            if (/^-?\d+(\.\d+)?$/.test(value)) {
              return { valid: true };
            } else {
              return { valid: false, message: 'Expected a valid double (e.g., 100.5).' };
            }
          default:
            return { valid: true };
        }
      }
      await extractAndValidateFeelExpressions(dmnXml);
      if (validationErrors.length > 0) {
        res.status(400).send({ errors: validationErrors });
      } else {
        res.status(200).send({ message: 'DMN validated successfully.' });
      }
    } catch (error) {
      console.error('Error saving DMN:', error);
      res.status(400).send({ errors: validationErrors });
     res.status(500).send({ error: 'An error occurred while saving the DMN.' });
    }
  });
  


app.listen(PORT, () => {
   // console.log(`Backend server is running at http://140.238.244.160:${3003}`);
    console.log(`Backend server is running at http://localhost:${3003}`);
});
