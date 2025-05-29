interface Post {
	id: number;
	message: string;
	email: string;
	created_at: Date;
	// updated_at: string; // unused
}

interface PostWithUsername extends Post {
	username: string;
}

interface User {
	id: number;
	email: string;
	username: string;
	created_at: Date;
}
