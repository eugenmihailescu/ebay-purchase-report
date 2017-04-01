/**
 * Collects the eBay purchase history data from the current page and prints-out a report in the given format.
 * 
 * @params {string=} format - Either 'plain', 'json' or 'object'. Default or invalid value defaults to 'plain' text format.
 * @param {string=}
 *            sortby - Specify the sort order column name (purchaseDate, price, deliveryDate, shipStatus). Default to natural
 *            order.
 * @param {bool=}
 *            reverseorder - Specify true if the sorting must be in reverse order, false otherwise. Default to false.
 */
(function(format, sortby, reverseorder) {
  format = format || 'plain';
  sortby = sortby || '';
  reverseorder = reverseorder || false;

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
        a.push(minlen.hasOwnProperty(f) ? strpad(String(fields[f]), minlen[f]) : fields[f]);
      }
    }
    console.log('| ' + a.join(' | '));
  }

  /**
   * Get the inner text of a HTML element
   * 
   * @param {Object}
   *            element - The DOM element
   * @param {String}
   *            value - The default value if element is NULL
   * @return {String}
   */
  function getInnerText(element, value) {
    return null !== element ? element.innerText : value;
  }

  /**
   * Get the attribute value of a HTML element
   * 
   * @param {Object}
   *            element - The DOM element
   * @param {string}
   *            name - The attribute name
   * @param {String}
   *            value - The default value if element is NULL
   * @return {String}
   */
  function getAttribute(element, name, value) {
    return null !== element ? element.getAttribute(name) : value;
  }

  var sep = '-'.repeat(160);
  var i;
  var e;
  var c;
  var v;
  var g = 0;
  var s = 0;
  var ts = 0;
  var j = 0;
  var t = 0;
  var gt = 0;
  var currency;
  var prevDate = '';
  var prevCurrency = '';
  var currencies = [];
  var items = [];
  var collen = {
    index: 5,
    purchaseDate: 13,
    price: 13,
    deliveryDate: 27,
    shipStatus: 20
  };
  var coltitle = {
    index: '#',
    purchaseDate: 'Purchase Date',
    price: 'Item Price',
    shipStatus: 'Shipping Status',
    deliveryDate: 'Estimated Delivery Date',
    specs: 'Item description'
  };

  // parse the document
  var orders = document.querySelectorAll('#orders .result-set-r .order-r');
  var order, item;
  for (order in orders) {
    if (orders.hasOwnProperty(order)) {
      var purchaseDate = getInnerText(orders[order].querySelector('.order-row .purchase-header .row-date'), '');
      var orderItems = orders[order].querySelectorAll('.item-level-wrap');

      for (item in orderItems) {
        if (orderItems.hasOwnProperty(item)) {
          var purchasePrice = getInnerText(orderItems[item].querySelector('.cost-label'), 0);
          var itemSpec = getInnerText(orderItems[item].querySelector('.item-spec-r .item-title'), '');
          var deliveryDate = getInnerText(orderItems[item].querySelector('.item-spec-r .delivery-date strong'), '');
          var shipStatus = getAttribute(orderItems[item].querySelector('.purchase-info-col .order-status .ph-ship'), 'title', '');

          items.push({
            purchaseDate: purchaseDate,
            price: purchasePrice,
            specs: itemSpec,
            deliveryDate: deliveryDate,
            shipStatus: shipStatus.replace(/.*?([\d\/]+)/g, '$1')
          });
        }
      }
    }
  }

  // sort the result
  if (sortby.length && collen.hasOwnProperty(sortby)) {
    // sort by non-date field
    var sort1 = function(a, b) {
      if (sortby)
        return reverseorder ? a[sortby] < b[sortby] : a[sortby] > b[sortby];
    };

    // sort by date field
    var sort2 = function(a, b) {
      var x = Date.parse(a[sortby].replace(/.*-\s*/g, ''));
      var y = Date.parse(b[sortby].replace(/.*-\s*/g, ''));

      return reverseorder ? y - x : x - y;
    };

    // sort by number
    var sort3 = function(a, b) {
      var x = parseFloat(a[sortby].replace(/[^\d.]+/g, ''));
      var y = parseFloat(b[sortby].replace(/[^\d.]+/g, ''));

      return reverseorder ? y - x : x - y;
    };

    if ('price' == sortby) {
      items.sort(sort3);
    } else
    if ('purchaseDate' != sortby && 'deliveryDate' != sortby && 'shipStatus' != sortby) {
      items.sort(sort1);
    } else {
      items.sort(sort2);
    }
  }

  console.clear();

  // output the report in json|object format
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
  } else
  // output the report in plain format
  {
    var header = 'eBay purchase history ordered ';
    header += sortby.length && collen.hasOwnProperty(sortby) ? 'by ' + coltitle[sortby] + ' in ' + (reverseorder ? 'descendent' : 'ascendent') : 'in natural';
    header += ' order';
    console.log(header);

    console.log(sep);
    printRow(coltitle, collen);
    console.log(sep);

    for (i = 0; i < items.length; i += 1) {
      e = items[i];
      c = e.price.replace(/.*?([a-zA-Z]+)/g, '$1');

      // print the group footer
      if ((('' == sortby || 'purchaseDate' == sortby || 'shipStatus' == sortby || 'deliveryDate' == sortby) && prevDate.length && e.purchaseDate != prevDate) || (prevCurrency.length && c != prevCurrency)) {
        printGrpFooter('SUBTOTAL', t, currency, j, s);
        g += 1;
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

      // print the item's row
      printRow({
        index: i + 1,
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

    // print the last group footer
    if (g) {
      printGrpFooter('SUBTOTAL', t, currency, j, s);
    }

    // print the grand total
    if (1 == currencies.length) {
      printGrpFooter('GRAND TOTAL', gt, currencies[0], items.length, ts);
    }
  }
})('plain', '', false);
