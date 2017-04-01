/**
 * Collects the eBay purchase history data from the current page and prints-out a report in the given format.
 * 
 * @params {string} format - Either 'printout', 'json' or 'object'. Default or invalid value defaults to 'printout'.
 */
(function($, format) {
  format = format || 'printout';
  /**
     * Prints-out a group subtotal
     * 
     * @param {string}
     *            label - The group's total prefix label
     * @param {number}
     *            value - The group's total value
     * @param {string}
     *            currency - The group's currency for the value
     * @param {int}
     *            count - The group's total number of items
     * @param {int}
     *            shipped - The group's total number of shipped items
     */
  function printGrpFooter(label, value, currency, count, shipped) {
    console.log(sep);
    console.log(' ' + label + ': ' + Math.round(value, 2) + ' ' + currency + ', ' + shipped + ' shipped, ' + (count - shipped) + ' not-shipped (' + count + ' items, ~ ' + Math.round(value / count, 2) + ' ' + currency + '/item)');
    console.log(sep);
  }
  
  /**
     * Prints-out a row for the given fields by padding their values with spaces if not having a given minimum length.
     * 
     * @param {Object}
     *            fields - An object containing the field's key name and their corresponding values
     * @param {Object}
     *            minlen - An object containing the field's key name and their corresponding minimum length
     */
  function printRow(fields, minlen) {
    var f,
      a = [],
      v;
    for (f in fields) {
      if (fields.hasOwnProperty(f)) {
        a.push(minlen.hasOwnProperty(f) ? strpad(fields[f], minlen[f]) : fields[f]);
      }
    }
    console.log('| ' + a.join(' | '));
  }
  /**
     * Returns a string padded with space if not reaching a given minimum length
     * 
     * @param {string}
     *            str - The string to pad
     * @param {int}
     *            minlen - The desired minimum length. If the string length is less than this value then the remaining length
     *            will be padded with spaced
     * @return {string} - Returns the padded string
     */
  function strpad(str, minlen) {
    var i = minlen - str.length;
    return str + (i > 0 ? ' '.repeat(i) : '');
  }
  
  var sep = '-'.repeat(160);
  var i,
    e,
    c,
    v,
    s = 0,
    ts = 0,
    j = 0,
    t = 0,
    gt = 0,
    currency,
    prevDate = '',
    prevCurrency = '',
    currencies = [],
    items = [],
    collen = {
      purchaseDate: 13,
      price: 13,
      deliveryDate: 27,
      shipStatus: 20
    };
  console.clear();
  $('#orders .result-set-r .order-r').each(function(key, value) {
    var purchaseDate = $(value).find('.order-row .purchase-header .row-date').text();
    $(value).find('.item-level-wrap').each(function(k, v) {
      var purchasePrice = $(v).find('.cost-label').text();
      var itemSpec = $(v).find('.item-spec-r .item-title').text();
      var deliveryDate = $(v).find('.item-spec-r .delivery-date strong').text();
      var shipStatus = $(v).find('.purchase-info-col .order-status .ph-ship').prop('title');
      items.push({
        purchaseDate: purchaseDate,
        price: purchasePrice,
        specs: itemSpec,
        deliveryDate: deliveryDate,
        shipStatus: shipStatus.replace(/.*?([\d\/]+)/g, '$1')
      });
    });
  });
  if ('json' == format || 'object' == format) {
    var json = {};
    items.forEach(function(v, k) {
      json[k] = v;
    });
    if ('object' == format) {
      console.log(json);
    } else {
      console.log(JSON.stringify(json));
    }
  } else {
    console.log(sep);
    printRow({
      purchaseDate: 'Date',
      price: 'Price',
      shipStatus: 'Shipping Status',
      deliveryDate: 'Estimated Delivery Date',
      specs: 'Item description'
    }, collen);
    console.log(sep);
    for (i = 0; i < items.length; i += 1) {
      e = items[i];
      c = e.price.replace(/.*?([a-zA-Z]+)/g, '$1');
      if ((prevDate.length && e.purchaseDate != prevDate) || (prevCurrency.length && c != prevCurrency)) {
        printGrpFooter('SUBTOTAL', t, currency, j, s);
        j = 0;
        t = 0;
        s = 0;
        prevDate = e.purchaseDate;
        prevCurrency = c;
      }
      if (/\d+/g.test(e.shipStatus)) {
        s += 1;
        ts += 1;
      }
      currency = c;
      v = parseFloat(e.price.replace(/.*?([\d\.]+).*/g, '$1'));
      t += v;
      gt += v;
      printRow({
        purchaseDate: e.purchaseDate,
        price: e.price,
        shipStatus: e.shipStatus,
        deliveryDate: e.deliveryDate,
        specs: e.specs
      }, collen);
      j += 1;
      prevDate = e.purchaseDate;
      prevCurrency = currency;
      if (currencies.indexOf(prevCurrency) < 0) {
        currencies.push(prevCurrency);
      }
    }
    printGrpFooter('SUBTOTAL', t, currency, j, s);
    if (1 == currencies.length) {
      printGrpFooter('GRAND TOTAL', gt, currencies[0], items.length, ts);
    }
  }
})(jQuery, 'printout');
