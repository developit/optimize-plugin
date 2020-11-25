/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import { h, render } from 'preact';
import { useState } from 'preact/hooks';

function lazy (load) {
  let pending, component;
  return function Lazy (props) {
    const [, render] = useState({});
    if (!pending) {
      pending = pending || load() || (() => {});
      if (pending && pending.then) pending.then(c => render(component = c));
      else component = pending;
    }
    return component ? h(component, props) : null;
  };
}

const Home = lazy(() => import(/* webpackChunkName:"home" */ './home'));
const Profile = lazy(() => import(/* webpackChunkName:"profile" */ './profile'));
const About = lazy(() => import(/* webpackChunkName:"about" */ './about'));

function App ({ url }) {
  return h('div', { id: 'app' },
    h('h1', { class: 'header' }, 'hello world'),
    h(Home, null),
    h(About, null),
    h(Profile, null)
  );
}

render(h(App, null), document.body);
