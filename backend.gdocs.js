this.recline = this.recline || {};
this.recline.Backend = this.recline.Backend || {};
this.recline.Backend.GDocs = this.recline.Backend.GDocs || {};

(function(my) {
  my.__type__ = 'gdocs';

  var Deferred = _.isUndefined(this.jQuery) ? _.Deferred : jQuery.Deferred;

  // ## Google spreadsheet backend
  // 
  // Fetch data from a Google Docs spreadsheet.
  //
  // Dataset must have a url attribute pointing to the Gdocs or its JSON feed e.g.
  // <pre>
  // var dataset = new recline.Model.Dataset({
  //     url: 'https://docs.google.com/spreadsheet/ccc?key=0Aon3JiuouxLUdGlQVDJnbjZRSU1tUUJWOUZXRG53VkE#gid=0'
  //   },
  //   'gdocs'
  // );
  //
  // var dataset = new recline.Model.Dataset({
  //     url: 'https://spreadsheets.google.com/feeds/list/0Aon3JiuouxLUdDQwZE1JdV94cUd6NWtuZ0IyWTBjLWc/od6/public/values?alt=json'
  //   },
  //   'gdocs'
  // );
  // </pre>
  //
  // @return object with two attributes
  //
  // * fields: array of Field objects
  // * records: array of objects for each row
  my.fetch = function(dataset) {
    var dfd  = new Deferred(); 
    var urls = my.getGDocsAPIUrls(dataset.url);

    // TODO cover it with tests
    // get the spreadsheet title
    (function () {
      var titleDfd = new Deferred();

      jQuery.getJSON(urls.spreadsheetAPI, function (d) {
          titleDfd.resolve({
              spreadsheetTitle: d.feed.title.$t
          });
      });

      return titleDfd.promise();
    }()).then(function (response) {

      // get the actual worksheet data
      jQuery.getJSON(urls.worksheetAPI, function(d) {
        var result = my.parseData(d);
        var fields = _.map(result.fields, function(fieldId) {
          return {id: fieldId};
        });

        var metadata = _.extend(urls, {
              title: response.spreadsheetTitle +" - "+ result.worksheetTitle,
              spreadsheetTitle: response.spreadsheetTitle,
              worksheetTitle  : result.worksheetTitle
        });
        dfd.resolve({
          metadata: metadata,
          records       : result.records,
          fields        : fields,
          useMemoryStore: true
        });
      });
    });

    return dfd.promise();
  };

  // ## parseData
  //
  // Parse data from Google Docs API into a reasonable form
  //
  // :options: (optional) optional argument dictionary:
  // columnsToUse: list of columns to use (specified by field names)
  // colTypes: dictionary (with column names as keys) specifying types (e.g. range, percent for use in conversion).
  // :return: tabular data object (hash with keys: field and data).
  // 
  // Issues: seems google docs return columns in rows in random order and not even sure whether consistent across rows.
  my.parseData = function(gdocsSpreadsheet, options) {
    var options  = options || {};
    var colTypes = options.colTypes || {};
    var results = {
      fields : [],
      records: []
    };
    var entries = gdocsSpreadsheet.feed.entry || [];
    var key;
    var colName;
    // percentage values (e.g. 23.3%)
    var rep = /^([\d\.\-]+)\%$/;

    for(key in entries[0]) {
      // it's barely possible it has inherited keys starting with 'gsx$'
      if(/^gsx/.test(key)) {
        colName = key.substr(4);
        results.fields.push(colName);
      }
    }

    // converts non numberical values that should be numerical (22.3%[string] -> 0.223[float])
    results.records = _.map(entries, function(entry) {
      var row = {};

      _.each(results.fields, function(col) {
        var _keyname = 'gsx$' + col;
        var value = entry[_keyname].$t;
        var num;
 
        // TODO cover this part of code with test
        // TODO use the regexp only once
        // if labelled as % and value contains %, convert
        if(colTypes[col] === 'percent' && rep.test(value)) {
          num   = rep.exec(value)[1];
          value = parseFloat(num) / 100;
        }

        row[col] = value;
      });

      return row;
    });

    results.worksheetTitle = gdocsSpreadsheet.feed.title.$t;
    return results;
  };

  // Convenience function to get GDocs JSON API Url from standard URL
  // 
  // @param url: url to gdoc to the GDoc API (or just the key/id for the Google Doc)
  my.getGDocsAPIUrls = function(url, worksheetIndex) {
    // https://docs.google.com/spreadsheet/ccc?key=XXXX#gid=YYY
    var regex = /.*spreadsheet\/ccc?.*key=([^#?&+]+)[^#]*(#gid=([\d]+).*)?/,
      matches = url.match(regex),
      key
        ;
    
    if (!!matches) {
        key = matches[1];
        // the gid in url is 0-based and feed url is 1-based
        worksheet = parseInt(matches[3]) + 1;
        if (isNaN(worksheet)) {
          worksheet = 1;
        }
    }
    else if (url.indexOf('spreadsheets.google.com/feeds') != -1) {
        // we assume that it's one of the feeds urls
        key = url.split('/')[5];
        // by default then, take first worksheet
        worksheet = 1;
    } else {
      key = url;
      worksheet = 1;
    }
    worksheet = (worksheetIndex || worksheetIndex ===0) ? worksheetIndex : worksheet;

    return {
      worksheetAPI: 'https://spreadsheets.google.com/feeds/list/'+ key +'/'+ worksheet +'/public/values?alt=json',
      spreadsheetAPI: 'https://spreadsheets.google.com/feeds/worksheets/'+ key +'/public/basic?alt=json',
      spreadsheetKey: key,
      worksheetIndex: worksheet
    };
  };
}(this.recline.Backend.GDocs));
