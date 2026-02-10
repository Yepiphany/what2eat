# Stage 1: Build Frontend
FROM node:20 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Final Image
FROM modelscope-registry.cn-beijing.cr.aliyuncs.com/modelscope-repo/python:3.10
WORKDIR /home/user/app
COPY ./ /home/user/app
# Copy the built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist /home/user/app/frontend/dist

RUN pip install --no-cache-dir -r requirements.txt
WORKDIR /home/user/app/backend
ENV PORT=7860
ENTRYPOINT ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
