# aps-ema-extractor

**IMPORTANT UPDATE 2021-09-11**: The APS EMA API no longer seems to be available so **THIS CODE WILL FAIL**. A new API is available, and this project will be updated once the new API is understood. **END UPDATE.**

aps-ema-extractor is a simple client for the APS EMA API that allows Solar PV data to be extracted.
If you have a solar photovoltaic system (i.e.: solar panels) connected to an Energy Communications Unit (ECU) by [Altenergy Power Systems (APS)](https://apsystems.com/), then you can login to APS's Energy Monitoring & Analysis (EMA) portal [https://apsystemsema.com/ema/index.action](https://apsystemsema.com/ema/index.action). If you have the credentials for this portal, you can use this client to fetch your data in CSV format, and to also have it run via [If This Then That (IFTTT)](https://ifttt.com/) on a schedule (daily, for example) and have the results e-mailed out to you so that you get a periodic CSV report by e-mail. When you run this via IFTTT, you can also get periodic summaries via e-mail, for example weekly or monthly.

## Basic steps:
1. fetch the latest code
    `git clone https://github.com/rukmalf/aps-ema-extractor.git`
2. install npm dependencies
    `npm install`
3. setup configuration
    1. create directory `config` in your checkout location
    2. create file `config/default.json`. See sample
        ```json
        {
            "username": "<your username on the APS EMA Portal>",
            "password": "<your password on the APS EMA Portal>",
            "logLevel": 2
        }
        ```
        Here's more on the configuration options:
        |Option|Meaning|
        |---|---|
        |logLevel|Optiona. Default is 1 (errors only). 0 = no logging, 1 = errors only, 2 = verbose logging|
        |output|Optional. Default is json output. "csv" results in a CSV output|
        |runTests|Optional. Default is false. If set to true, runs unit tests in standalone mode|
        |overrideDate|Optional. By default fetches the ECU data for the system date, but can be specified (in "yyyymmdd" format) to fetch ECU data for an arbitrary date.|

## Test:
aps-ema-extractor has some simple built in unit tests that you can run to verify it's working as it should. Note that the unit tests *do not* connect to the backend API.
Set `runTests` to `true` in `config/default.json` and run in standalone mode to execute tests and exit (without connecting to backend API).
You can also run tests directly by running
`node ./aps-ema-extractor.tests.js`

## Run standalone:
`node ./aps-ema-extractor.js`
This connects to the APS EMA API using the username and password given in the config file (`config/default.json`) and fetches the daily values for the executing system's current date. By default, the json response returned from the API is logged to stdout, but if the config file has `output` set to `csv`, a CSV (comma separated values) output is generated.
You can also fetch data for a specific date by setting it in "yyyymmdd" format in the `overrideDate` parameter in the config file.

## Deploy with IFTTT:
TODO
