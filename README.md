# TpT-Connect

TpT-Connect is an extension to [Redux](https://github.com/reactjs/redux) which
creates a simple interface for components' data fetching.

## Install

```Bash
$ npm install --save @teachers/tpt-connect
```

## Usage

#### As a black box

```JavaScript
import { ConnectProvider } from '@teachers/tpt-connect';

render() {
  <ConnectProvider>
    <RootComponent />
  </ConnectProvider>
}
```

#### As a Redux plugin

Create your Redux store with the `tpt-connect`'s reducer and middleware:

```JavaScript
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import { connectReducer, connectMiddleware } from '@teachers/tpt-connect';

const store =
  createStore(combineReducers({
    main: rootReducer,
    connect: connectReducer
  }), optionalInitialState, applyMiddleware(connectMiddleware));

render() {
  <Provider store={ store }>
    <RootComponent />
  </Provider>
}
```

#### And in your components throughout the app:

```JavaScript
import { defineResources, Schema, arrayOf } from '@teachers/tpt-connect';

class User extends Component {
  static propTypes = {
    user: PropTypes.object
  };

  renderDeleteNotification() {
    return (
      <p>This user is deleted, brah.</p>
    )
  }

  render() {
    const { user, followers } = this.props;

    return (
      <div>
        { user.value.isDeleted && this.renderDeleteNotification() }
        <p>Name: { user.value.name }</p>
        <p>Deleted: { user.value.isDeleted }</p>

        <button onClick={ user.delete }}>
          DELETE USER
        </button>

        <button onClick={ followers.fetch }>
          Load User Followers
        </button>

        <div>
          { followers.value.map((follower) =>
            <div>
              <p>{ follower.name }</p>
              <button onClick={ () => followers.delete(follower.id) }>Remove Follower</button>
            </div>
          ) }
        </div>
      </div>
    );
  }
}

exports default defineResources((state, ownProps) => {
  const userSchema = new Schema('user');

  return {
    user: {
      schema: userSchema,
      url: `http://tpt.com/users/${ownProps.userId}`,
      actions: {
        delete: {
          method: 'DELETE'
        },
        update: (newProps) => ({
          method: 'PATCH',
          body: {
            id: ownProps.userId,
            lastName: newProps.lastName
          }
        })
      },

      followers: {
        schema: arrayOf(userSchema),
        url: `http://tpt.com/users/${ownProps.userId}/followers`,
        auto: false,
        actions: {
          create: (params) => ({
            method: 'POST',
            body: {
              firstName: params.firstName,
              lastName: params.lastName
            }
          }),
          delete: (followerId) => ({
            method: 'DELETE',
            url: `http://tpt.com/users/${ownProps.userId}/followers/${followerId}`
          })
        }
      }
    }

  };
})(User);
```

These are the options each resource definition takes:

- `auto` (`Boolean`, optional, defaults to `true` when `GET`; otherwise `false`) -
  determines whether the request should be dispatched automatically on
  `componentDidMount` and on `componentDidUpdate` when the resource definition
  changed (ie URL is dependent on `props.id` and it changes after a client
  action).

- `schema` (`Schema`, required) - an instance of
  [normalizr](://github.com/gaearon/normalizr)'s `Schema` used for TpT-Connect
  to infer how the resource returned to be stored in the global state for
  future use.

- `url` (`String`, required) - a complete url of the endpoint

- `params` (`Object`, optional) - an object listing the endpoint's query params.
  This is the preferred method to add query params to a request. If the params
  are hardcoded in the URL, TpT-Connect will not be able to normalize them and
  store the resource for future use by other components.

- `method` (`Object`, optional, defaults to `GET`) - the request's method to be
  used.

- `headers` (`Object`, optional, defaults to `{ 'Content-Type':
  'application/json' }`) - the request's headers.

- `body` (`Object`, optional) - the request's payload.

- `extends` (`Object`, optional) - a resource definition this definition
  inherits from. This is useful to centralize resource definitions to be
  used across multiple components.

- `clientOnly` (`Boolean`, options, defaults to `false`) - will prevent
  resources from being fetched when rendered on the server (when `isServer` is
  set to `true` on `ConnectProvider`).

- `normalize` (`Function`, optional, defaults to
  [normalizr](https://github.com/gaearon/normalizr#normalizeobj-schema-options)'s
  `normalize`) - a function used to normalize the JSON returned from the
  server. Useful when responses are nested within additional properties. The
  function has the following signature:

  ```
  normalize(Object json, Schema schema, [Object options]) : Object normalizedJson
  ```

- `store` (`Boolean`, options, defaults to `true` when `GET`; otherwise
  `false`) - whether or not TpT-Connect should store the response data in its
  Redux store.

- `actions` (`Object`, optional) - an object defining functions or objects that
  will be available on the TpT Connect resource. Calling those functions will
  execute the defined action. For more information, check out the example
  above.

  - Built-in actions on all resources:
    - `fetch` - will force fetch the data
    - `invalidate` - will mark the data as invalid in the store

### Server Rendering

Thanks to TpT-Connect keeping track of its outstanding requests for resources
in its store, the above example could be easily rendered on the server as well:

```JavaScript

// By setting `isServer`, TpT-Connect knows to fetch even w/out
// componentDidMount which is called only on client
const tree = (
  <ConnectProvider isServer store={ myStore }>
    <RootComponent />
  </ConnectProvider>
);

// Subscribing to our store to respond to client only when all of our data is
// ready
const unsubscribe = myStore.subscribe(() => {
  if (myStore.getState().connect.isAllFetched) {
    // trigger second render now that we have all data
    const html = ReactDOM.renderToStaticMarkup(tree);
    unsubscribe();
    res.status(200).send(html);
  }
});

// First render to trigger all of TpT-Connect's automatic fetches
ReactDOM.renderToStaticMarkup(tree);

```

### Debugging

TpT-Connect uses [debug](https://github.com/visionmedia/debug). In order to
turn on more verbose logging, set the `tptconnect` namespace in localStorage to
allow `info`, `error`, or all via `*`. For example, to enable all levels of
logging for TpT-Connect, set:

```JavaScript
localStorage.debug = 'tptconnect:*';
```

(NOTE: when running on the server, set the env var `DEBUG`)

