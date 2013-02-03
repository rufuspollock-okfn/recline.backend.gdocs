A simple javascript library that wraps the Google Docs JSON API. Part of the
[Recline][] suite of data libraries.

[Recline]: http://okfnlabs.org/recline/

## Usage

Get data from the API:

    recline.Backend.GDocs.fetch({
      url: 'https://docs.google.com/a/okfn.org/spreadsheet/ccc?key=0Aon3JiuouxLUdDlGV2lCakoydVh1U014cHRqcXpoWVE#gid=0'
    })
      .done(function(result) {
        // structure of result is below
        console.log(result);
      });

The result of fetch has a convenient structure of the following form:

    result = {
      records: // array of Objects
      fields: // array of Field Objects as per http://www.dataprotocols.org/en/latest/json-table-schema.html
      metadata: {
        spreadsheetTitle: ...,
        worksheetTitle: ...,
        title: spreadsheetTitle +" :: "+ result.worksheetTitle
      }
    }

You can also use GDocs parsing without depending on jQuery:

    // json should be the JSON you get from the Google Docs JSON API
    var out = recline.Backend.GDocs.parseData(json);


## Dependencies

* underscore
* jQuery (optional) - only if you want ajax requests
* underscore.deferred (optional) - only needed if no jQuery

One of the reasons for the different options is that it ensures you can use
this library in the browser *and* in webworkers (where jQuery does not
function).

