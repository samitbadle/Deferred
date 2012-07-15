module("Deferred");

//TODO parameterise tests to reduce code duplication

test("isPromise should determine if the argument is a deferred object", function () {
  var d1 = new Deferred();
  ok(Deferred.isPromise(d1), 'isPromise(Deferred)');
  ok(!Deferred.isPromise(null), 'isPromise(null)');
  ok(!Deferred.isPromise(function () { }), 'isPromise(function() {})');
  ok(!Deferred.isPromise({}), 'isPromise({})');
  ok(!Deferred.isPromise(new Array(10)), 'isPromise(new Array(10))');
});

test("A Deferred object should be able to handle various arguments types", function () {
  new Deferred().done(function (arg) {
    equal(arg, null, 'null argument')
  }).resolve(null);
  new Deferred().done(function (arg) {
    equal(arg, null, 'no argument')
  }).resolve();
  new Deferred().done(function (arg1, arg2) {
    equal(arg1, "a", 'two arguments');
    equal(arg2, 10, 'two arguments');
  }).resolve("a", 10);
  new Deferred().done(function (arg) {
    equal(arg, 42, 'int argument')
  }).resolve(42);
  new Deferred().done(function (arg) {
    deepEqual(arg, [42, 24], 'array argument')
  }).resolve([42, 24]);
  new Deferred().done(function (arg) {
    deepEqual(arg, {'name':'deferred'}, 'object argument')
  }).resolve({'name':'deferred'});
});

test("A Deferred object should fire the done callbacks when it is resolved", function () {
  expect(13);
  var d1dc = 0;
  var d1fc = 0;
  var pass = false;
  var d1 = new Deferred().done(
      function () {
        d1dc++;
      }).fail(
      function () {
        d1fc++;
      }).then(function () {
        d1dc++;
      }, function () {
        d1fc++;
      });
  equal(d1.state(), 'pending', 'Initial state should be pending');
  ok(d1.isPending(), 'Initial state isPending');
  ok(!d1.isResolved(), 'Initial state !isResolved');
  ok(!d1.isRejected(), 'Initial state !isRejected');
  d1.resolve('testdata');
  equal(d1.state(), 'resolved', 'state should change to resolved');
  ok(d1dc == 2 && d1fc == 0, 'Done callbacks');
  deepEqual(d1.value(), {"0":'testdata'}, 'value should be an array like object of the resolved arguments');
  //Done after resolved test
  d1.done(function (data) {
    equal(data, 'testdata', 'Once resolved, new done callback should also be called');
    pass = true;
  });
  ok(pass, 'New done callback should be called');
  //Resolved Status test
  equal(d1.state(), 'resolved', 'Final state should be resolved');
  ok(!d1.isPending(), 'Final state !isPending');
  ok(d1.isResolved(), 'Final state isResolved');
  ok(!d1.isRejected(), 'Final state !isRejected');
});

test("A Deferred object should fire the fail callbacks when it is rejected", function () {
  expect(13);
  var d1dc = 0;
  var d1fc = 0;
  var pass = false;
  var d1 = new Deferred().done(
      function () {
        d1dc++;
      }).fail(
      function () {
        d1fc++;
      }).then(function () {
        d1dc++;
      }, function () {
        d1fc++;
      });
  equal(d1.state(), 'pending', 'Initial state should be pending');
  ok(d1.isPending(), 'Initial state isPending');
  ok(!d1.isResolved(), 'Initial state !isResolved');
  ok(!d1.isRejected(), 'Initial state !isRejected');
  d1.reject('faileddata');
  equal(d1.state(), 'rejected', 'State should change to rejected');
  ok(d1dc == 0 && d1fc == 2, 'Fail callbacks');
  deepEqual(d1.value(), {"0":'faileddata'}, 'value should be array like object of the rejected arguments');
  //Fail after rejected test
  pass = false;
  d1.fail(function (data) {
    equal(data, 'faileddata', 'Once rejected, new fail callback should also be called');
    pass = true;
  });
  ok(pass, 'New fail callback should be called');
  //Rejected Status test
  equal(d1.state(), 'rejected', 'Final state should be rejected');
  ok(!d1.isPending(), 'Final state !isPending');
  ok(!d1.isResolved(), 'Final state !isResolved');
  ok(d1.isRejected(), 'Final state isRejected');
});

test("A resolved Deferred object should not allow state changes", function () {
  var d1 = new Deferred().resolve('bla');
  ok(d1.isResolved(), 'Verifying state is already resolved');
  raises(function () {
    d1.resolve('blabla');
  }, /fulfilled/, 'should raise exception');
  ok(d1.isResolved(), 'state should be still resolved');
  raises(function () {
    d1.reject('blablabla');
  }, /fulfilled/, 'should raise exception');
  ok(d1.isResolved(), 'state should be still resolved');
});

test("A rejected Deferred object should not allow state changes", function () {
  var d1 = new Deferred().reject('bla');
  ok(d1.isRejected(), 'Verifying state is already rejected');
  raises(function () {
    d1.resolve('blabla');
  }, /fulfilled/, 'should raise exception');
  ok(d1.isRejected(), 'state should be still rejected');
  raises(function () {
    d1.reject('blablabla');
  }, /fulfilled/, 'should raise exception');
  ok(d1.isRejected(), 'state should be still rejected');
});

test("Chaining deferred should create the chained deferred when the top deferred is resolved", function () {
  expect(11);
  var dcc = 0;  //done callback count
  var d1 = new Deferred(function (deferred) {
    //Also test Deferred ctor
    deferred.done(function (arg) {
      dcc++;
      equal(arg, 'd2resolved', 'top deferred callback and argument');
    })
  });
  var d2;
  var dm = d1.pipe(function (arg) {
    d2 = new Deferred().done(function (arg) {
      dcc++;
      equal(arg, 'finalargs', 'chained deferred callback and argument');
    });
    return d2;
  });
  var pass = false;
  dm.done(function (data) {
    dcc++;
    equal(data, 'finalargs', 'master deferred callback and argument');
    pass = true;
  });
  ok(dcc == 0, 'To start with, no callbacks should be called');
  ok(!d2, 'Chained deferred should not be created');
  d1.resolve('d2resolved');
  ok(dcc == 1, 'Resolving top deferred should invoke the top done callback');
  ok(d2, 'Chained deferred should be created');
  ok(dm.isPending(), 'Master should be still pending');
  d2.resolve('finalargs');
  equal(dcc, 3, 'Resolving the chained deferred should invoke the callbacks for both the chained and master deferred!');
  equal(dm.state(), "resolved", 'Master deferred state should be resolved');
  ok(pass, 'Master deferred done callback should have been called');
});

test("Mapped deferred should return the results of the map function", function () {
  expect(7);
  var dcc = 0;  //done callback count
  var d4 = new Deferred(function (deferred) {
    deferred.done(function (arg) {
      dcc++;
      equal(arg, 'd4resolved', 'top deferred callback and argument');
    })
  });
  var df = d4.pipe(function (arg) {
    dcc++;
    equal(arg, 'd4resolved', 'filter callback and argument');
    if (arg == 'd4resolved') {
      return 'filtered';
    }
    return arg;
  });
  var pass = false;
  df.done(function (data) {
    dcc++;
    if (data == 'filtered') {
      pass = true;
    }
    equal(data, 'filtered', 'master deferred callback and argument');
  });
  ok(dcc == 0, 'To start with, no callbacks should be called');
  d4.resolve('d4resolved');
  equal(dcc, 3, 'Resolving the top deferred should invoke the callbacks for both the top and master deferred as well as the filter function!');
  equal(df.state(), "resolved", 'Master deferred state should be resolved');
  ok(pass, 'Master deferred done callback should have been called');
});

test("A filtered Deferred object should be able to handle various arguments types", function () {
  function newFiltered(verifyFn) {
    var d = new Deferred();
    d.pipe(function() {return Array.prototype.slice.call(arguments);}).done(verifyFn);
    return d;
  }
  newFiltered(function (arg) { equal(arg, null, 'null argument') }).resolve(null);
  newFiltered(function (arg) { equal(arg, null, 'no argument') }).resolve();
  newFiltered(function (arg1, arg2) { equal(arg1, "a", 'two arguments'); equal(arg2, 10, 'two arguments'); }).resolve("a", 10);
  newFiltered(function (arg) { equal(arg, 42, 'int argument') }).resolve(42);
  newFiltered(function (arg) { deepEqual(arg, [42, 24], 'array argument') }).resolve([42, 24]);
  newFiltered(function (arg) { deepEqual(arg, {'name':'deferred'}, 'object argument') }).resolve({'name':'deferred'});
  var d1 = new Deferred();
  d1.pipe(function() {return null;}).done(function (arg) { equal(arg, null, 'null argument') });
  d1.resolve("a", 10);
});

test("A chained Deferred object should be able to handle various arguments types", function () {
  expect(28);
  function chainedArguments(topFnName, chainedFnName, masterFnName) {
    var testType = topFnName + '/' + chainedFnName + '/' + masterFnName;
    var dc;
    function newChained() {
      dc = new Deferred();
      return dc;
    }
    function newFiltered(verifyFn) {
      var d = new Deferred();
      d.pipe(newChained, newChained)[masterFnName](verifyFn);
      return d;
    }
    newFiltered(function (arg) { equal(arg, null, testType + ' null argument') })[topFnName]();
    dc[chainedFnName](null);
    newFiltered(function (arg) { equal(arg, null, testType + ' no argument') })[topFnName]();
    dc[chainedFnName]();
    newFiltered(function (arg1, arg2) { equal(arg1, "a", testType + ' two arguments'); equal(arg2, 10, testType + ' two arguments'); })[topFnName]();
    dc[chainedFnName]("a", 10);
    newFiltered(function (arg) { equal(arg, 42, testType + ' int argument') })[topFnName]();
    dc[chainedFnName](42);
    newFiltered(function (arg) { deepEqual(arg, [42, 24], testType + ' array argument') })[topFnName]();
    dc[chainedFnName]([42, 24]);
    newFiltered(function (arg) { deepEqual(arg, {'name':'deferred'}, testType + ' object argument') })[topFnName]();
    dc[chainedFnName]({'name':'deferred'});
  }
  chainedArguments('resolve', 'resolve', 'done');
  chainedArguments('resolve', 'reject', 'fail');
  chainedArguments('reject', 'reject', 'fail');
  chainedArguments('reject', 'resolve', 'done');
});

