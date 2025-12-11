import { connectToMongoDB } from './mongodb';
import type { User } from '../auth/auth';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'users';

export async function createUser(user: Omit<User, 'id'>): Promise<User> {
  const db = await connectToMongoDB();
  const collection = db.collection(COLLECTION_NAME);
  
  const newUser = {
    ...user,
    createdAt: new Date().toISOString()
  };
  
  const result = await collection.insertOne(newUser);
  
  return {
    ...newUser,
    id: result.insertedId.toString()
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await connectToMongoDB();
  const collection = db.collection(COLLECTION_NAME);
  
  const user = await collection.findOne({ email });
  
  if (!user) {
    return null;
  }
  
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    provider: user.provider,
    createdAt: user.createdAt
  };
}

export async function findUserById(id: string): Promise<User | null> {
  const db = await connectToMongoDB();
  const collection = db.collection(COLLECTION_NAME);
  
  try {
    const user = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!user) {
      return null;
    }
    
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      provider: user.provider,
      createdAt: user.createdAt
    };
  } catch (error) {
    console.error('[DB] Error finding user by ID:', error);
    return null;
  }
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const db = await connectToMongoDB();
  const collection = db.collection(COLLECTION_NAME);
  
  try {
    const { id: _, ...updateData } = updates;
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return null;
    }
    
    return {
      id: result._id.toString(),
      email: result.email,
      name: result.name,
      provider: result.provider,
      createdAt: result.createdAt
    };
  } catch (error) {
    console.error('[DB] Error updating user:', error);
    return null;
  }
}

// Note: Pour les mots de passe, vous devrez utiliser bcrypt pour les hasher
// Exemple avec bcrypt (à installer: npm install bcryptjs @types/bcryptjs)
// import bcrypt from 'bcryptjs';
// const hashedPassword = await bcrypt.hash(password, 10);

