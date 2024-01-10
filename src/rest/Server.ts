import express, {Application, Request, Response} from "express";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import {InsightDatasetKind} from "../controller/IInsightFacade";
import {Query} from "../model/Query";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private static insightFacade: InsightFacade | undefined;

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();

		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		this.express.use(express.static("./frontend/public"));
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				Server.insightFacade = new InsightFacade();
				this.server = this.express.listen(this.port, () => {
					console.info(`Server::start() - server listening on port: ${this.port}`);
					resolve();
				}).on("error", (err: Error) => {
					// catches errors in server start
					console.error(`Server::start() - server ERROR: ${err.message}`);
					reject(err);
				});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				Server.insightFacade = undefined;
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	public refreshInsightFacade() {
		Server.insightFacade = new InsightFacade();
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// Endpoints
		this.express.put("/dataset/:id/:kind", Server.putDataset);
		this.express.delete("/dataset/:id", Server.deleteDataset);
		this.express.post("/query", Server.postQuery);
		this.express.get("/datasets", Server.getDatasetList);
	}

	private static putDataset(req: Request, res: Response) {
		let content = Buffer.from(req.body).toString("base64");
		let id = req.params.id;
		let kind = req.params.kind as InsightDatasetKind;
		if (!Server.insightFacade) {
			res.status(400)
				.json({error: "No InsightFacade instance created. Restart server and try again."});
			return;
		}
		Server.insightFacade.addDataset(id, content, kind).then((arr) => {
			res.status(200).json({result: arr});
		}).catch((err) => res.status(400).json({error: (err as Error).message}));
	}

	private static deleteDataset(req: Request, res: Response) {
		let id = req.params.id;
		if (!Server.insightFacade) {
			res.status(400)
				.json({error: "No InsightFacade instance created. Restart server and try again."});
			return;
		}
		Server.insightFacade.removeDataset(id).then((str) => {
			res.status(200).json({result: str});
		}).catch((err) => {
			let status = 400;
			if ((err as Error).message.includes("does not exist")) {
				status = 404;
			}
			res.status(status).json({error: (err as Error).message});
		});
	}

	private static postQuery(req: Request, res: Response) {
		let query = req.body as Query;
		if (!Server.insightFacade) {
			res.status(400)
				.json({error: "No InsightFacade instance created. Restart server and try again."});
			return;
		}
		Server.insightFacade.performQuery(query).then((arr) => {
			res.status(200).json({result: arr});
		}).catch((err) => res.status(400).json({error: (err as Error).message}));
	}

	private static getDatasetList(req: Request, res: Response) {
		if (!Server.insightFacade) {
			res.status(400)
				.json({error: "No InsightFacade instance created. Restart server and try again."});
			return;
		}
		Server.insightFacade.listDatasets().then((arr) => {
			res.status(200).json({result: arr});
		}).catch((err) => res.status(400).json({error: (err as Error).message}));
	}
}
