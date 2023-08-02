
# Bungie OAuth Next.js Example

## About
This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

The project is a bare-bones app containing nothing more than what is required to do OAuth and a few examples of making authenticated requests. Is this app doing everything the best way? Idfk. Does it work? Yeah.

## Getting Started

First, install the dependencies

```bash
npm install
```

#### Create your own bungie.net app
- Set env vars

#### Local SSL
Bungie's OAuth setup *REQUIRES* that you use `https`, even when developing locally. You *CANNOT* use `http`. Next.js does not supoort using `https` locally out of the box. To get `https` workng locally we need to create and use a locally-trusted SSL certificate.

Follow these steps: (All commands should be run from the root directory of your project)
##### Mac
First install `mkcert`; a tool that we will use to create a locally-trusted SSL certificate.
`brew install mkcert`

Next create a "Certificate Authority" and add it's certificate to your system's trust store.
`mkcert -install`

Finally create an SSL Certificate for `localhost`
`mkcert localhost`

Verify that the two files `localhost-key.pem` and `localhost.pem` were created in the root directory of your project.

##### Windows
- IDFK if you know pls contribute

## Run The App
Run the development server:

```bash
npm run dev
```

and open [https://localhost:3001](https://localhost:3001) in your browser

## Other Useful Things To Know
- data.destinysets.com
- VSCode extension
- API Discord
- This youtube video
- [paracausal.science](https://paracausal.science/guide/api/app-setup)